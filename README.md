# Priority-Weighted Traffic Routing Prototype

This repository contains a standalone prototype of a priority-weighted, anti-herding traffic routing system with an independent audit layer.

## What is simulated

- A synthetic road network generated with `networkx`
- Trip arrivals over simulated time
- Congestion using a BPR-style load function
- Priority categories: `emergency`, `transit_fixed_schedule`, `freight_time_critical`, `commuter_general`
- A routing engine that evaluates k-shortest paths, applies priority weights, and diversifies away from herd routes
- An audit service that fetches the published policy over HTTP and checks the decision log independently

## What is not included

- No real GPS, weather, or incident feeds
- No ML/GNN prediction model
- No Kafka/Kinesis/Redis
- No user interface
- No Docker requirement for the primary run path

## Run the demo

```bash
pip install -r requirements.txt
python run_demo.py
```

To demonstrate the audit catching a silent policy deviation:

```bash
python run_demo.py --deviate
```

## Run components separately

Start the routing API:

```bash
uvicorn routing_engine.main:app --reload
```

Run the audit service on an existing log database:

```bash
python -m audit_service.main --log-db data/decisions.sqlite3 --policy-base-url http://127.0.0.1:8000 --version v1
```

## Demo behavior

`run_demo.py` does three things:

1. Generates a synthetic network and trip stream
2. Compares routing with diversification off versus on, showing the reduction in herd concentration on the single top route
3. Runs the audit service against a routing log and, when `--deviate` is enabled, demonstrates the audit flagging the mismatch against the published weight schedule

The audit report is written to `data/audit_report.json` and also printed to stdout.
