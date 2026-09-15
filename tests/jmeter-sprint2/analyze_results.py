from __future__ import annotations
import csv
import statistics
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("Usage: python analyze_results.py <results.jtl>")

path = Path(sys.argv[1])
rows = []
with path.open(newline="", encoding="utf-8", errors="replace") as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row.get("label") == "02 - Authorization Check":
            rows.append(row)

if not rows:
    raise SystemExit("No '02 - Authorization Check' samples found.")

elapsed = sorted(float(r["elapsed"]) for r in rows)
latency = sorted(float(r.get("Latency") or 0) for r in rows)
success = [str(r.get("success", "")).lower() == "true" for r in rows]

def pct(values, p):
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    k = (len(values)-1) * (p/100.0)
    f = int(k)
    c = min(f+1, len(values)-1)
    if f == c:
        return values[f]
    return values[f] + (values[c]-values[f]) * (k-f)

timestamps = [int(float(r["timeStamp"])) for r in rows if r.get("timeStamp")]
duration_s = max((max(timestamps) - min(timestamps)) / 1000.0, 0.001) if timestamps else 0.001
throughput = len(rows) / duration_s
errors = len(rows) - sum(success)

print("\n=== AUTHORIZATION CHECK PERFORMANCE SUMMARY ===")
print(f"Samples      : {len(rows)}")
print(f"Passed       : {sum(success)}")
print(f"Failed       : {errors}")
print(f"Error %      : {(errors/len(rows))*100:.2f}%")
print(f"Min          : {min(elapsed):.2f} ms")
print(f"Average      : {statistics.mean(elapsed):.2f} ms")
print(f"Median       : {statistics.median(elapsed):.2f} ms")
print(f"P90          : {pct(elapsed,90):.2f} ms")
print(f"P95          : {pct(elapsed,95):.2f} ms")
print(f"P99          : {pct(elapsed,99):.2f} ms")
print(f"Max          : {max(elapsed):.2f} ms")
print(f"Avg latency  : {statistics.mean(latency):.2f} ms")
print(f"Throughput   : {throughput:.2f} req/s")
print("Target       : <= 300 ms per authorization check")
print("Target result: " + ("PASS" if pct(elapsed,95) <= 300 and errors == 0 else "REVIEW/FAIL"))
