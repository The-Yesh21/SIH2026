import math
from typing import Dict, Any, Tuple, List, Optional

# Official GPS Coordinates and Chainage for SWR Mysuru -> Bengaluru Corridor Stations
SWR_TRACK_WAYPOINTS = [
    {"code": "MYS", "name": "Mysuru Junction", "km": 0.000, "lat": 12.3164, "lon": 76.6498},
    {"code": "NHY", "name": "Naganahalli", "km": 8.550, "lat": 12.3734, "lon": 76.6621},
    {"code": "S", "name": "Shrirangapatna", "km": 14.750, "lat": 12.4180, "lon": 76.6852},
    {"code": "PANP", "name": "Pandavapura", "km": 19.700, "lat": 12.4412, "lon": 76.6710},
    {"code": "BDRL", "name": "Byadarahalli", "km": 28.850, "lat": 12.4815, "lon": 76.7554},
    {"code": "CGKR", "name": "Chandragirikopal", "km": 35.050, "lat": 12.5021, "lon": 76.8123},
    {"code": "MYA", "name": "Mandya", "km": 45.366, "lat": 12.5244, "lon": 76.8967},
    {"code": "HNK", "name": "Hanakere", "km": 55.150, "lat": 12.5512, "lon": 76.9745},
    {"code": "MAD", "name": "Maddur", "km": 64.540, "lat": 12.5852, "lon": 77.0425},
    {"code": "SET", "name": "Settihally", "km": 75.350, "lat": 12.6189, "lon": 77.1320},
    {"code": "CPT", "name": "Channapatna", "km": 82.802, "lat": 12.6518, "lon": 77.2084},
    {"code": "RMGM", "name": "Ramanagaram", "km": 93.860, "lat": 12.7235, "lon": 77.2810},
    {"code": "BID", "name": "Bidadi", "km": 108.626, "lat": 12.7981, "lon": 77.3824},
    {"code": "HJL", "name": "Hejjala", "km": 115.450, "lat": 12.8542, "lon": 77.4289},
    {"code": "KGI", "name": "Kengeri", "km": 126.032, "lat": 12.9121, "lon": 77.4839},
    {"code": "NYH", "name": "Nayandahalli", "km": 130.850, "lat": 12.9432, "lon": 77.5211},
    {"code": "SBC", "name": "KSR Bengaluru City", "km": 138.250, "lat": 12.9781, "lon": 77.5695},
]

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes Great Circle Distance between two GPS points in kilometers.
    """
    R = 6371.0  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def snap_gps_to_corridor_chainage(lat: float, lon: float) -> Dict[str, Any]:
    """
    Snaps a raw GPS (Latitude, Longitude) coordinate to the closest railway track segment
    and calculates exact SWR corridor chainage (KM 0.000 to KM 138.250).
    """
    best_km = 0.0
    min_dist_to_track_km = float("inf")
    nearest_station = SWR_TRACK_WAYPOINTS[0]

    # Find closest station waypoint
    for wp in SWR_TRACK_WAYPOINTS:
        d = haversine_distance_km(lat, lon, wp["lat"], wp["lon"])
        if d < min_dist_to_track_km:
            min_dist_to_track_km = d
            nearest_station = wp

    # Check track segments between consecutive waypoints for precise orthogonal projection
    best_segment_km = nearest_station["km"]
    for i in range(len(SWR_TRACK_WAYPOINTS) - 1):
        wp1 = SWR_TRACK_WAYPOINTS[i]
        wp2 = SWR_TRACK_WAYPOINTS[i + 1]

        # Vector representation
        seg_len_km = haversine_distance_km(wp1["lat"], wp1["lon"], wp2["lat"], wp2["lon"])
        if seg_len_km < 0.01:
            continue

        d1 = haversine_distance_km(lat, lon, wp1["lat"], wp1["lon"])
        d2 = haversine_distance_km(lat, lon, wp2["lat"], wp2["lon"])

        # Projection factor t along segment (0 <= t <= 1)
        # Using law of cosines approximation
        t = (d1 ** 2 - d2 ** 2 + seg_len_km ** 2) / (2 * seg_len_km ** 2)
        t = max(0.0, min(1.0, t))

        # Projected KM along corridor
        proj_km = wp1["km"] + t * (wp2["km"] - wp1["km"])
        
        # Approximate distance to segment
        proj_lat = wp1["lat"] + t * (wp2["lat"] - wp1["lat"])
        proj_lon = wp1["lon"] + t * (wp2["lon"] - wp1["lon"])
        dist_to_seg = haversine_distance_km(lat, lon, proj_lat, proj_lon)

        if dist_to_seg < min_dist_to_track_km:
            min_dist_to_track_km = dist_to_seg
            best_segment_km = proj_km

    # Determine Next Station Ahead
    next_station = SWR_TRACK_WAYPOINTS[-1]
    for wp in SWR_TRACK_WAYPOINTS:
        if wp["km"] > best_segment_km:
            next_station = wp
            break

    distance_to_next = max(0.0, round(next_station["km"] - best_segment_km, 2))

    return {
        "snapped_chainage_km": round(max(0.0, min(138.25, best_segment_km)), 3),
        "cross_track_offset_meters": round(min_dist_to_track_km * 1000.0, 1),
        "nearest_station_code": nearest_station["code"],
        "nearest_station_name": nearest_station["name"],
        "next_station_code": next_station["code"],
        "next_station_name": next_station["name"],
        "distance_to_next_station_km": distance_to_next,
        "is_on_corridor": min_dist_to_track_km < 15.0  # Within 15km of corridor track
    }
