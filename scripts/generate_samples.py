from pathlib import Path
import csv
import random

OUT = Path(__file__).resolve().parents[1] / "datasets"
OUT.mkdir(parents=True, exist_ok=True)
rng = random.Random(20261118)
GROUPS = ["North", "Central", "South", "Coastal"]


def rows_for(kind: str):
    for group_index, group in enumerate(GROUPS):
        group_shift = [0.0, 0.12, -0.08, 0.19][group_index]
        for device in range(1, 7):
            device_id = f"{group[:2].upper()}-{device:02d}"
            for observation in range(1, 6):
                workload = round(rng.uniform(0.5, 1.8), 3)
                temperature = round(rng.uniform(12, 38), 1)
                network = rng.choice(["wifi", "mesh", "cellular"])
                common = {"device_id": device_id, "device_group": group, "observation": observation, "workload_index": workload, "ambient_temp_c": temperature, "network_type": network}
                jitter = rng.gauss(0, 0.035)
                if kind == "sensor":
                    record = {**common, "response_time_ms": round(42 + workload * 9 + group_index * 2.2 + jitter * 10, 2), "measurement_accuracy_pct": round(97.7 - group_index * 0.65 - max(temperature - 25, 0) * 0.035 + jitter, 2), "calibration_offset": round(-0.08 + group_index * 0.035 + jitter * 0.3, 4), "failure_rate_pct": round(max(0, 0.65 + group_index * 0.17 + abs(jitter) * 3), 2), "missing_reading": int(rng.random() < (0.02 + group_index * 0.009)), "environment_sensitivity": round(0.16 + group_index * 0.035 + abs(temperature - 25) * 0.006 + abs(jitter), 3)}
                    filename = "sensor_fairness_sample.csv"
                elif kind == "actuator":
                    record = {**common, "activation_delay_ms": round(68 + workload * 11 + group_index * 3.0 + jitter * 13, 2), "command_success_rate_pct": round(99.2 - group_index * 0.48 + jitter * 2, 2), "response_consistency_ms": round(max(1.5, 4.2 + group_index * 0.8 + abs(jitter) * 8), 2), "actuator_failure_rate_pct": round(max(0.1, 0.45 + group_index * 0.15 + abs(jitter) * 1.7), 2), "commands_per_minute": round(18 + workload * 5 + rng.uniform(-2, 2), 2)}
                    filename = "actuator_fairness_sample.csv"
                elif kind == "communication":
                    record = {**common, "network_latency_ms": round(24 + workload * 4 + group_index * 7 + jitter * 15, 2), "packet_loss_pct": round(max(0, 0.35 + group_index * 0.38 + abs(jitter) * 2), 2), "bandwidth_mbps": round(max(4, 38 - group_index * 4.8 + rng.gauss(0, 2.4)), 2), "connection_reliability_pct": round(99.6 - group_index * 0.55 + jitter, 2), "communication_delay_ms": round(31 + workload * 6 + group_index * 5 + jitter * 11, 2), "network_availability_pct": round(99.7 - group_index * 0.42 + rng.gauss(0, 0.1), 2)}
                    filename = "communication_fairness_sample.csv"
                else:
                    record = {**common, "bandwidth_allocation_mbps": round(max(3, 22 - group_index * 2.4 + workload * 3 + rng.gauss(0, 1.2)), 2), "cpu_utilization_pct": round(min(99, 36 + workload * 17 + group_index * 5 + rng.gauss(0, 3)), 2), "memory_usage_mb": round(185 + workload * 45 + group_index * 13 + rng.gauss(0, 11), 2), "energy_consumption_wh": round(2.3 + workload * 0.8 + group_index * 0.22 + rng.gauss(0, 0.12), 3), "processing_share_pct": round(max(3, 25 - group_index * 2 + workload * 1.6 + rng.gauss(0, 1.3)), 2), "resource_availability_pct": round(99 - group_index * 0.68 + rng.gauss(0, 0.16), 2)}
                    filename = "resource_allocation_fairness_sample.csv"
                yield filename, record


for kind in ("sensor", "actuator", "communication", "resource"):
    generated = list(rows_for(kind))
    path = OUT / generated[0][0]
    with path.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(generated[0][1].keys()), lineterminator="\n")
        writer.writeheader()
        writer.writerows(record for _, record in generated)
    print(f"Created {path.name}: {len(generated)} simulated rows")
