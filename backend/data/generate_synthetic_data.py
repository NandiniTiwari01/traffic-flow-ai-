"""
Synthetic Traffic Data Generator for Nagpur Junctions.

Generates 30 days × 24 hours × 12 (5-min intervals) = 8,640 rows per junction.
Features: hour_of_day, day_of_week, is_weekend, base_volume_pct, weather_code,
          lanes, capacity, current_vehicles, current_speed, current_density.

Targets (one row per sample, per horizon):
  vehicles_{5,10,15,30}m, speed_{5,10,15,30}m,
  density_{5,10,15,30}m,  congestion_prob_{5,10,15,30}m
"""

import os
import random
import math
import csv
from pathlib import Path

# ---------------------------------------------------------------------------
# Nagpur junction specifications (mirrors frontend data)
# ---------------------------------------------------------------------------
JUNCTIONS = [
    {"id": "nag-01", "name": "Sitabuldi Interchange",      "lanes": 6, "capacity": 220, "free_flow": 55, "peak_bias": 1.25},
    {"id": "nag-02", "name": "Dharampeth Square",           "lanes": 4, "capacity": 150, "free_flow": 48, "peak_bias": 1.10},
    {"id": "nag-03", "name": "RBI Square (Sadar)",          "lanes": 6, "capacity": 200, "free_flow": 58, "peak_bias": 0.85},
    {"id": "nag-04", "name": "Chhatrapati Square",          "lanes": 6, "capacity": 210, "free_flow": 52, "peak_bias": 1.30},
    {"id": "nag-05", "name": "Medical Square",              "lanes": 4, "capacity": 160, "free_flow": 46, "peak_bias": 1.05},
    {"id": "nag-06", "name": "Shankar Nagar Square",        "lanes": 4, "capacity": 140, "free_flow": 50, "peak_bias": 1.15},
    {"id": "nag-07", "name": "Lokmat Square",               "lanes": 6, "capacity": 190, "free_flow": 50, "peak_bias": 1.18},
]

WEATHER_CODES = {"Clear": 0, "Rain": 1, "Festival": 2, "Construction": 3}
WEATHER_WEIGHTS = [0.55, 0.20, 0.10, 0.15]  # probability distribution

DAYS = 30
INTERVALS_PER_HOUR = 12  # every 5 minutes
HOURS = 24
ROWS_PER_JUNCTION = DAYS * HOURS * INTERVALS_PER_HOUR  # 8640


def time_of_day_demand(hour: float) -> float:
    """Double-Gaussian demand curve: AM peak ~9h, PM peak ~18h."""
    am = math.exp(-0.5 * ((hour - 9) / 1.5) ** 2)
    pm = math.exp(-0.5 * ((hour - 18) / 1.8) ** 2)
    trough = 0.25
    return trough + (1 - trough) * max(am, pm, 0.35)


def greenshields_speed(density_pct: float, free_flow: float, jam_density: float = 98) -> float:
    k = min(density_pct, jam_density) / jam_density
    return max(3.0, free_flow * (1 - k * k))


def weather_multiplier(code: int) -> tuple[float, float]:
    """Returns (volume_multiplier, speed_penalty)."""
    if code == 1:
        return 1.35, 0.72
    elif code == 2:
        return 1.25, 0.88
    elif code == 3:
        return 1.15, 0.82
    return 1.0, 1.0


def generate_dataset(output_path: str) -> None:
    random.seed(42)
    
    fieldnames = [
        "junction_id", "junction_name", "lanes", "capacity",
        "hour", "minute", "day_of_week", "is_weekend",
        "weather_code", "base_volume_pct",
        "current_vehicles", "current_speed", "current_density",
        # Targets for each prediction horizon
        "vehicles_5m",  "speed_5m",  "density_5m",  "congestion_prob_5m",
        "vehicles_10m", "speed_10m", "density_10m", "congestion_prob_10m",
        "vehicles_15m", "speed_15m", "density_15m", "congestion_prob_15m",
        "vehicles_30m", "speed_30m", "density_30m", "congestion_prob_30m",
    ]

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    total_rows = 0
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for junc in JUNCTIONS:
            jid = junc["id"]
            jname = junc["name"]
            capacity = junc["capacity"]
            free_flow = junc["free_flow"]
            peak_bias = junc["peak_bias"]
            lanes = junc["lanes"]

            for day in range(DAYS):
                dow = day % 7  # 0=Mon … 6=Sun
                is_weekend = 1 if dow >= 5 else 0
                weekend_factor = 0.70 if is_weekend else 1.0

                # Daily weather (same for entire day)
                wcode = random.choices(list(WEATHER_CODES.values()), weights=WEATHER_WEIGHTS, k=1)[0]
                vol_mult, spd_pen = weather_multiplier(wcode)
                base_volume_pct = random.randint(80, 130)  # simulate slider

                for hour in range(HOURS):
                    for interval in range(INTERVALS_PER_HOUR):
                        minute = interval * 5
                        fractional_hour = hour + minute / 60.0

                        tod = time_of_day_demand(fractional_hour)
                        demand = capacity * 0.55 * (base_volume_pct / 100) * vol_mult * tod * peak_bias * weekend_factor

                        # Add stochastic noise
                        noise = random.gauss(0, demand * 0.12)
                        current_vehicles = max(5, min(int(capacity * 1.3), int(demand + noise)))
                        current_density = max(3, min(100, round((current_vehicles / capacity) * 100)))
                        raw_speed = greenshields_speed(current_density, free_flow)
                        current_speed = max(3, round(raw_speed * spd_pen + random.gauss(0, 1.5)))

                        # ----- Generate future ground-truth values -----
                        # Simulate what happens at +5, +10, +15, +30 min
                        horizons = {}
                        for mins_ahead in [5, 10, 15, 30]:
                            future_hour = fractional_hour + mins_ahead / 60.0
                            if future_hour >= 24:
                                future_hour -= 24
                            future_tod = time_of_day_demand(future_hour)
                            future_demand = capacity * 0.55 * (base_volume_pct / 100) * vol_mult * future_tod * peak_bias * weekend_factor

                            # Momentum: future is partially influenced by current state
                            momentum = 0.6 if mins_ahead <= 10 else 0.4 if mins_ahead <= 15 else 0.2
                            blended_demand = momentum * current_vehicles + (1 - momentum) * future_demand
                            future_noise = random.gauss(0, blended_demand * 0.08)
                            future_vehicles = max(5, min(int(capacity * 1.3), int(blended_demand + future_noise)))
                            future_density = max(3, min(100, round((future_vehicles / capacity) * 100)))
                            future_speed = max(3, round(
                                greenshields_speed(future_density, free_flow) * spd_pen + random.gauss(0, 1.2)
                            ))
                            # Congestion probability: density-based + noise
                            cong_prob = max(5, min(99, round(
                                future_density * 0.9 + (5 if future_density > 70 else 0) + random.gauss(0, 3)
                            )))
                            suffix = f"_{mins_ahead}m"
                            horizons[f"vehicles{suffix}"] = future_vehicles
                            horizons[f"speed{suffix}"] = future_speed
                            horizons[f"density{suffix}"] = future_density
                            horizons[f"congestion_prob{suffix}"] = cong_prob

                        row = {
                            "junction_id": jid,
                            "junction_name": jname,
                            "lanes": lanes,
                            "capacity": capacity,
                            "hour": hour,
                            "minute": minute,
                            "day_of_week": dow,
                            "is_weekend": is_weekend,
                            "weather_code": wcode,
                            "base_volume_pct": base_volume_pct,
                            "current_vehicles": current_vehicles,
                            "current_speed": current_speed,
                            "current_density": current_density,
                            **horizons,
                        }
                        writer.writerow(row)
                        total_rows += 1

    print(f"[OK] Generated {total_rows:,} rows across {len(JUNCTIONS)} junctions -> {output_path}")


if __name__ == "__main__":
    out = str(Path(__file__).parent / "nagpur_synthetic_traffic.csv")
    generate_dataset(out)
