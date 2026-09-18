import pandas as pd
import numpy as np

stations = pd.read_parquet('data/processed/station_records.parquet')
sections = []
for journey_id, grp in stations.sort_values(['journey_id', 'station_sequence']).groupby('journey_id'):
    # drop stations where train didn't record timestamps
    obs = grp.dropna(subset=['actual_departure', 'actual_arrival', 'scheduled_departure', 'scheduled_arrival'])
    rows = obs.to_dict('records')
    total_km = max((r['route_distance_km'] or 0) for r in rows) if rows else 0
    for a, b in zip(rows, rows[1:]):
        actual = (b['actual_arrival'] - a['actual_departure']).total_seconds() / 60.0
        scheduled = (b['scheduled_arrival'] - a['scheduled_departure']).total_seconds() / 60.0
        dist = (b['route_distance_km'] or 0) - (a['route_distance_km'] or 0)
        if actual > 0.5 and scheduled > 0 and dist > 0:
            speed = dist / (actual / 60.0)
            if speed <= 180:
                sections.append({
                    'journey_id': journey_id,
                    'train_id': a['train_id'],
                    'train_name': a['train_name'],
                    'date': a['date'],
                    'section_id': f"{a['station']}-{b['station']}",
                    'section_distance_km': dist,
                    'scheduled_section_travel_time': scheduled,
                    'actual_section_travel_time': actual,
                    'departure_delay_minutes': a['departure_delay_minutes'],
                    'arrival_delay_minutes': a['arrival_delay_minutes'],
                    'next_arrival_delay_minutes': b['arrival_delay_minutes']
                })

df_sec = pd.DataFrame(sections)
print('New sections count:', len(df_sec))
print('Unique trains:\n', df_sec['train_id'].value_counts())
print('Unique sections:\n', df_sec['section_id'].value_counts())
