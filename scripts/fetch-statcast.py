#!/usr/bin/env python3
from __future__ import annotations

import csv
import io
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

DEFAULT_TIMEOUT = 30
REQUEST_DELAY_SEC = float(os.getenv("MLB_REQUEST_DELAY_SEC", "0.5"))
MAX_RETRIES = int(os.getenv("MLB_MAX_RETRIES", "4"))

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SEASON = os.getenv("MLB_SEASON", str(datetime.now(timezone.utc).year))

NAME_KEY = "last_name, first_name"

BATTER_URL = (
    "https://baseballsavant.mlb.com/leaderboard/custom"
    f"?year={SEASON}&type=batter&min=q"
    "&selections=xwoba,xba,xslg,exit_velocity_avg,barrel_batted_rate,hard_hit_percent"
    "&csv=true"
)
PITCHER_URL = (
    "https://baseballsavant.mlb.com/leaderboard/custom"
    f"?year={SEASON}&type=pitcher&min=q"
    "&selections=xwoba,exit_velocity_avg,barrel_batted_rate,whiff_percent,chase_percent"
    "&csv=true"
)
SPRINT_URL = f"https://baseballsavant.mlb.com/leaderboard/sprint_speed?year={SEASON}&min=10&csv=true"


def fetch_csv_rows(session: requests.Session, url: str) -> list[dict[str, str]]:
    """GET a Baseball Savant CSV export (BOM + quoted headers) and parse it into dict rows."""
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(url, timeout=DEFAULT_TIMEOUT)
            response.raise_for_status()
            text = response.content.decode("utf-8-sig")
            return list(csv.DictReader(io.StringIO(text)))
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt == MAX_RETRIES:
                break
            sleep_sec = min(2**attempt, 10)
            print(f"[WARN] request failed ({attempt}/{MAX_RETRIES}): {url} -> {exc}; retry in {sleep_sec}s")
            time.sleep(sleep_sec)

    raise RuntimeError(f"failed request: {url}") from last_error


def write_csv(path: Path, fieldnames: list[str], rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def main() -> None:
    session = requests.Session()

    print(f"[INFO] fetching Statcast data for season={SEASON}")

    try:
        batter_rows = fetch_csv_rows(session, BATTER_URL)
        time.sleep(REQUEST_DELAY_SEC)
        pitcher_rows = fetch_csv_rows(session, PITCHER_URL)
        time.sleep(REQUEST_DELAY_SEC)
        sprint_rows = fetch_csv_rows(session, SPRINT_URL)
    except RuntimeError as exc:
        print(f"[ERROR] {exc}; keeping existing CSVs")
        sys.exit(1)

    # ponytail: fail loud instead of silently writing a degraded/empty CSV over good data
    if not batter_rows or not pitcher_rows or not sprint_rows:
        print(
            "[ERROR] empty result from one or more endpoints "
            f"(batter={len(batter_rows)} pitcher={len(pitcher_rows)} sprint={len(sprint_rows)}); "
            "keeping existing CSVs"
        )
        sys.exit(1)

    sprint_by_id = {row.get("player_id"): row.get("sprint_speed", "") for row in sprint_rows}

    hitting_fieldnames = [
        "player_id",
        "player_name",
        "year",
        "xwoba",
        "xba",
        "xslg",
        "exit_velocity_avg",
        "barrel_batted_rate",
        "hard_hit_percent",
        "sprint_speed",
    ]
    hitting_rows = [
        {
            "player_id": row.get("player_id"),
            "player_name": row.get(NAME_KEY, ""),
            "year": row.get("year", SEASON),
            "xwoba": row.get("xwoba", ""),
            "xba": row.get("xba", ""),
            "xslg": row.get("xslg", ""),
            "exit_velocity_avg": row.get("exit_velocity_avg", ""),
            "barrel_batted_rate": row.get("barrel_batted_rate", ""),
            "hard_hit_percent": row.get("hard_hit_percent", ""),
            "sprint_speed": sprint_by_id.get(row.get("player_id"), ""),
        }
        for row in batter_rows
    ]

    pitching_fieldnames = [
        "player_id",
        "player_name",
        "year",
        "xwoba",
        "exit_velocity_avg",
        "barrel_batted_rate",
        "whiff_percent",
        "chase_percent",
    ]
    pitching_rows = [
        {
            "player_id": row.get("player_id"),
            "player_name": row.get(NAME_KEY, ""),
            "year": row.get("year", SEASON),
            "xwoba": row.get("xwoba", ""),
            "exit_velocity_avg": row.get("exit_velocity_avg", ""),
            "barrel_batted_rate": row.get("barrel_batted_rate", ""),
            "whiff_percent": row.get("whiff_percent", ""),
            "chase_percent": row.get("chase_percent", ""),
        }
        for row in pitcher_rows
    ]

    write_csv(DATA_DIR / "statcast_hitting.csv", hitting_fieldnames, hitting_rows)
    write_csv(DATA_DIR / "statcast_pitching.csv", pitching_fieldnames, pitching_rows)

    print(f"[INFO] statcast_hitting.csv: {len(hitting_rows)} rows")
    print(f"[INFO] statcast_pitching.csv: {len(pitching_rows)} rows")


if __name__ == "__main__":
    main()
