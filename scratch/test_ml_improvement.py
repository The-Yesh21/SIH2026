import pandas as pd
import numpy as np
import lightgbm as lgb
from datetime import datetime

# Load stations
stations = pd.read_parquet('data/processed/station_records.parquet')

# Build comprehensive section hops
sections = []
for journey_id, grp in stations.sort_values(['journey_id', 'station_sequence']).groupby('journey_id'):
    obs = grp.dropna(subset=['actual_departure', 'actual_arrival', 'scheduled_departure', 'scheduled_arrival'])
    rows = obs.to_dict('records')
    total_km = max((r['route_distance_km'] or 0) for r in rows) if rows else 0
    for seq_idx, (a, b) in enumerate(zip(rows, rows[1:]), start=1):
        actual = (b['actual_arrival'] - a['actual_departure']).total_seconds() / 60.0
        scheduled = (b['scheduled_arrival'] - a['scheduled_departure']).total_seconds() / 60.0
        dist = (b['route_distance_km'] or 0) - (a['route_distance_km'] or 0)
        if 0.5 <= actual <= 240 and scheduled > 0 and dist > 0:
            speed = dist / (actual / 60.0)
            if speed <= 180:
                sections.append({
                    'journey_id': journey_id,
                    'train_id': str(a['train_id']),
                    'train_name': a['train_name'],
                    'date': a['date'],
                    'section_from': a['station'],
                    'section_from_name': a['station_name'],
                    'section_to': b['station'],
                    'section_to_name': b['station_name'],
                    'section_id': f"{a['station']}-{b['station']}",
                    'station_sequence': seq_idx,
                    'section_distance_km': dist,
                    'remaining_distance_km': total_km - (a['route_distance_km'] or 0),
                    'scheduled_departure': a['scheduled_departure'],
                    'actual_departure': a['actual_departure'],
                    'scheduled_arrival_next': b['scheduled_arrival'],
                    'actual_arrival_next': b['actual_arrival'],
                    'scheduled_section_travel_time': scheduled,
                    'actual_section_travel_time': actual,
                    'departure_delay_minutes': float(a['departure_delay_minutes'] or 0),
                    'arrival_delay_minutes': float(a['arrival_delay_minutes'] or 0),
                    'next_arrival_delay_minutes': float(b['arrival_delay_minutes'] or 0),
                    'source_url': a['source_url']
                })

df = pd.DataFrame(sections).sort_values(['date', 'train_id', 'station_sequence']).reset_index(drop=True)

# Feature engineering
dep = pd.to_datetime(df['actual_departure'], utc=True).dt.tz_convert('Asia/Kolkata')
df['day_of_week'] = dep.dt.dayofweek
df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
df['hour'] = dep.dt.hour
df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24.0)
df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24.0)
df['month'] = dep.dt.month

# Delay dynamics
df['current_delay'] = df['departure_delay_minutes']
df['previous_station_delay'] = df['arrival_delay_minutes']
df['delay_momentum'] = df['current_delay'] - df['previous_station_delay']
df['is_delayed'] = (df['current_delay'] > 15.0).astype(int)
df['is_on_time'] = (df['current_delay'] <= 5.0).astype(int)
df['log_current_delay'] = np.log1p(np.maximum(0, df['current_delay']))

# Speed & slack
df['scheduled_speed_kmph'] = df['section_distance_km'] / (df['scheduled_section_travel_time'] / 60.0)
df['previous_section_travel_time'] = df.groupby('journey_id')['actual_section_travel_time'].shift(1)
origin_dep = df.groupby('journey_id')['actual_departure'].transform('min')
df['time_since_departure'] = (df['actual_departure'] - origin_dep).dt.total_seconds() / 60.0

# Train Priority
priority_map = {
    '12614': 1, # Superfast Express (Wodeyar SF)
    '12785': 1, # Superfast Express (Kacheguda SF)
    '16231': 2, # Express (Mayiladuturai Exp)
    '16316': 2, # Express (Kochuveli Exp)
    '16216': 2, # Express (Chamundi Exp)
    '16220': 2, # Express (Chamarajanagar Exp)
    '16228': 2, # Express (Talguppa Exp)
    '56232': 3, # Passenger (SMVB Passenger)
}
df['train_priority'] = df['train_id'].map(priority_map).fillna(2)

# Causal historical statistics (Expanding window with shift(1))
df['section_overage'] = df['actual_section_travel_time'] - df['scheduled_section_travel_time']
df = df.sort_values(['section_id', 'date', 'train_id']).reset_index(drop=True)
g = df.groupby('section_id')['actual_section_travel_time']
df['hist_mean_section_time'] = g.transform(lambda s: s.shift(1).expanding().mean())
df['hist_median_section_time'] = g.transform(lambda s: s.shift(1).expanding().median())
df['hist_section_variance'] = g.transform(lambda s: s.shift(1).expanding().var())

go = df.groupby('section_id')['section_overage']
df['hist_mean_section_overage'] = go.transform(lambda s: s.shift(1).expanding().mean())
df['hist_median_section_overage'] = go.transform(lambda s: s.shift(1).expanding().median())
df['hist_recent_section_overage'] = go.transform(lambda s: s.shift(1).rolling(5, min_periods=1).mean())

# Punctuality dev per train
df = df.sort_values(['train_id', 'date', 'station_sequence']).reset_index(drop=True)
jdev = df.groupby('journey_id')['section_overage'].mean().rename('j_overage')
df = df.merge(jdev, on='journey_id', how='left')
df['train_punctuality_dev'] = df.groupby('train_id')['j_overage'].transform(lambda s: s.shift(1).expanding().mean())
df = df.drop(columns=['j_overage'])

# Journey overage so far
df = df.sort_values(['journey_id', 'station_sequence']).reset_index(drop=True)
df['journey_overage_so_far'] = df.groupby('journey_id')['section_overage'].transform(lambda s: s.shift(1).expanding().mean())

# Fill NAs
fill_cols = [
    'hist_mean_section_time', 'hist_median_section_time', 'hist_section_variance',
    'hist_mean_section_overage', 'hist_median_section_overage', 'hist_recent_section_overage',
    'previous_section_travel_time', 'time_since_departure', 'train_punctuality_dev', 'journey_overage_so_far'
]
for col in fill_cols:
    df[col] = df[col].fillna(df[col].median() if df[col].notna().any() else 0.0)

# Train/Section categorical codes
train_codes = {t: i for i, t in enumerate(sorted(df['train_id'].unique()))}
section_codes = {s: i for i, s in enumerate(sorted(df['section_id'].unique()))}
df['train_code'] = df['train_id'].map(train_codes)
df['section_code'] = df['section_id'].map(section_codes)

feature_cols = [
    'train_code', 'section_code', 'train_priority', 'station_sequence',
    'section_distance_km', 'remaining_distance_km', 'scheduled_section_travel_time',
    'scheduled_speed_kmph', 'day_of_week', 'is_weekend', 'hour', 'hour_sin', 'hour_cos',
    'current_delay', 'previous_station_delay', 'delay_momentum', 'is_delayed', 'is_on_time', 'log_current_delay',
    'previous_section_travel_time', 'time_since_departure',
    'hist_mean_section_time', 'hist_median_section_time', 'hist_section_variance',
    'hist_mean_section_overage', 'hist_median_section_overage', 'hist_recent_section_overage',
    'train_punctuality_dev', 'journey_overage_so_far'
]

# Chronological split
dates = sorted(df['date'].unique())
n = len(dates)
i = int(n * 0.7)
j = int(n * 0.85)
train_dates, val_dates, test_dates = dates[:i], dates[i:j], dates[j:]

train = df[df['date'].isin(train_dates)].copy()
valid = df[df['date'].isin(val_dates)].copy()
test = df[df['date'].isin(test_dates)].copy()

print(f"Total rows: {len(df)}. Train: {len(train)}, Valid: {len(valid)}, Test: {len(test)}")

# Train LightGBM with Huber / L1 objective on deviation target
model = lgb.LGBMRegressor(
    objective='huber',
    huber_alpha=0.9,
    learning_rate=0.03,
    num_leaves=20,
    n_estimators=1000,
    min_child_samples=15,
    subsample=0.85,
    colsample_bytree=0.85,
    reg_alpha=0.5,
    reg_lambda=1.0,
    random_state=42,
    verbose=-1
)

for part in (train, valid, test):
    part['target_dev'] = part['actual_section_travel_time'] - part['scheduled_section_travel_time']

eval_set = [(valid[feature_cols], valid['target_dev'])]
model.fit(
    train[feature_cols], train['target_dev'],
    eval_set=eval_set,
    callbacks=[lgb.early_stopping(50, verbose=False)]
)

def evaluate(name, part):
    y_true = part['actual_section_travel_time'].to_numpy()
    baseline = part['scheduled_section_travel_time'].to_numpy()
    pred = model.predict(part[feature_cols]) + baseline
    
    mae_base = np.mean(np.abs(baseline - y_true))
    mae_model = np.mean(np.abs(pred - y_true))
    rmse_base = np.sqrt(np.mean((baseline - y_true)**2))
    rmse_model = np.sqrt(np.mean((pred - y_true)**2))
    r2 = 1 - np.sum((pred - y_true)**2) / np.sum((y_true - y_true.mean())**2)
    bias = np.mean(pred - y_true)
    impr = (mae_base - mae_model) / mae_base * 100
    
    print(f"\n--- {name} Results (N={len(part)}) ---")
    print(f"Baseline MAE: {mae_base:.3f} min | Model MAE: {mae_model:.3f} min (Improvement: {impr:+.2f}%)")
    print(f"Baseline RMSE: {rmse_base:.3f} min | Model RMSE: {rmse_model:.3f} min")
    print(f"Model R2: {r2:.4f} | Bias: {bias:+.3f} min")

evaluate('Train', train)
evaluate('Validation', valid)
evaluate('Test', test)
