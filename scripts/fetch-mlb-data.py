#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

BASE_URL = "https://statsapi.mlb.com/api/v1"
DEFAULT_TIMEOUT = 30
REQUEST_DELAY_SEC = float(os.getenv("MLB_REQUEST_DELAY_SEC", "0.5"))
MAX_RETRIES = int(os.getenv("MLB_MAX_RETRIES", "4"))

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
SEASON = os.getenv("MLB_SEASON", str(datetime.now(timezone.utc).year))
TARGET_DATE = os.getenv("MLB_DATE", datetime.now(timezone.utc).strftime("%Y-%m-%d"))


def request_json(session: requests.Session, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{BASE_URL}{path}"
    last_error: Exception | None = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = session.get(url, params=params, timeout=DEFAULT_TIMEOUT)
            response.raise_for_status()
            return response.json()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if attempt == MAX_RETRIES:
                break
            sleep_sec = min(2**attempt, 10)
            print(f"[WARN] request failed ({attempt}/{MAX_RETRIES}): {url} -> {exc}; retry in {sleep_sec}s")
            time.sleep(sleep_sec)

    raise RuntimeError(f"failed request: {url}") from last_error


def coerce_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return json.dumps(value, ensure_ascii=False)


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        path.write_text("", encoding="utf-8")
        return

    fieldnames = sorted({key for row in rows for key in row.keys()})
    with path.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: coerce_value(row.get(key)) for key in fieldnames})


def fetch_schedule(session: requests.Session) -> list[dict[str, Any]]:
    payload = request_json(
        session,
        "/schedule",
        params={"sportId": 1, "date": TARGET_DATE},
    )
    rows: list[dict[str, Any]] = []
    for date_item in payload.get("dates", []):
        for game in date_item.get("games", []):
            away = game.get("teams", {}).get("away", {})
            home = game.get("teams", {}).get("home", {})
            rows.append(
                {
                    "game_pk": game.get("gamePk"),
                    "game_date": game.get("gameDate"),
                    "official_date": game.get("officialDate"),
                    "status": game.get("status", {}).get("detailedState"),
                    "status_code": game.get("status", {}).get("codedGameState"),
                    "double_header": game.get("doubleHeader"),
                    "day_night": game.get("dayNight"),
                    "series_description": game.get("seriesDescription"),
                    "away_team_id": away.get("team", {}).get("id"),
                    "away_team_name": away.get("team", {}).get("name"),
                    "away_score": away.get("score"),
                    "home_team_id": home.get("team", {}).get("id"),
                    "home_team_name": home.get("team", {}).get("name"),
                    "home_score": home.get("score"),
                    "venue_id": game.get("venue", {}).get("id"),
                    "venue_name": game.get("venue", {}).get("name"),
                }
            )
    return rows


def fetch_standings(session: requests.Session) -> list[dict[str, Any]]:
    payload = request_json(
        session,
        "/standings",
        params={"sportId": 1, "season": SEASON, "leagueId": "103,104"},
    )
    rows: list[dict[str, Any]] = []
    for record in payload.get("records", []):
        league = record.get("league", {})
        division = record.get("division", {})
        for team_record in record.get("teamRecords", []):
            team = team_record.get("team", {})
            streak = team_record.get("streak", {})
            split_records = team_record.get("records", {}).get("splitRecords", [])
            split_map = {str(item.get("type", "")).lower(): item for item in split_records}
            home = split_map.get("home", {})
            away = split_map.get("away", {})
            last_ten = split_map.get("lastten", {})
            rows.append(
                {
                    "season": SEASON,
                    "league_id": league.get("id"),
                    "league_name": league.get("name"),
                    "division_id": division.get("id"),
                    "division_name": division.get("name"),
                    "team_id": team.get("id"),
                    "team_name": team.get("name"),
                    "wins": team_record.get("wins"),
                    "losses": team_record.get("losses"),
                    "winning_percentage": team_record.get("winningPercentage"),
                    "games_back": team_record.get("gamesBack"),
                    "wildcard_games_back": team_record.get("wildCardGamesBack"),
                    "league_rank": team_record.get("leagueRank"),
                    "division_rank": team_record.get("divisionRank"),
                    "sport_rank": team_record.get("sportRank"),
                    "runs_scored": team_record.get("runsScored"),
                    "runs_allowed": team_record.get("runsAllowed"),
                    "run_differential": team_record.get("runDifferential"),
                    "streak_code": streak.get("streakCode"),
                    "streak_number": streak.get("streakNumber"),
                    "streak_type": streak.get("streakType"),
                    "home_wins": home.get("wins"),
                    "home_losses": home.get("losses"),
                    "away_wins": away.get("wins"),
                    "away_losses": away.get("losses"),
                    "last10_wins": last_ten.get("wins"),
                    "last10_losses": last_ten.get("losses"),
                }
            )
    return rows


def fetch_teams(session: requests.Session) -> list[dict[str, Any]]:
    payload = request_json(session, "/teams", params={"sportId": 1, "season": SEASON})
    rows: list[dict[str, Any]] = []
    for team in payload.get("teams", []):
        rows.append(
            {
                "season": SEASON,
                "team_id": team.get("id"),
                "name": team.get("name"),
                "team_code": team.get("teamCode"),
                "abbreviation": team.get("abbreviation"),
                "file_code": team.get("fileCode"),
                "location_name": team.get("locationName"),
                "short_name": team.get("shortName"),
                "franchise_name": team.get("franchiseName"),
                "club_name": team.get("clubName"),
                "league_id": team.get("league", {}).get("id"),
                "league_name": team.get("league", {}).get("name"),
                "division_id": team.get("division", {}).get("id"),
                "division_name": team.get("division", {}).get("name"),
                "venue_id": team.get("venue", {}).get("id"),
                "venue_name": team.get("venue", {}).get("name"),
                "first_year_of_play": team.get("firstYearOfPlay"),
                "active": team.get("active"),
            }
        )
    return rows


def fetch_players(session: requests.Session) -> list[dict[str, Any]]:
    payload = request_json(session, "/sports/1/players")
    rows: list[dict[str, Any]] = []
    for person in payload.get("people", []):
        rows.append(
            {
                "player_id": person.get("id"),
                "full_name": person.get("fullName"),
                "first_name": person.get("firstName"),
                "last_name": person.get("lastName"),
                "use_name": person.get("useName"),
                "primary_number": person.get("primaryNumber"),
                "birth_date": person.get("birthDate"),
                "current_age": person.get("currentAge"),
                "height": person.get("height"),
                "weight": person.get("weight"),
                "bat_side": person.get("batSide", {}).get("code"),
                "pitch_hand": person.get("pitchHand", {}).get("code"),
                "position_code": person.get("primaryPosition", {}).get("code"),
                "position_abbr": person.get("primaryPosition", {}).get("abbreviation"),
                "active": person.get("active"),
                "mlb_debut_date": person.get("mlbDebutDate"),
            }
        )
    return rows


def fetch_player_group_stats(session: requests.Session, group: str) -> list[dict[str, Any]]:
    payload = request_json(
        session,
        "/stats",
        params={
            "stats": "season",
            "group": group,
            "season": SEASON,
            "sportIds": 1,
            "limit": 5000,
        },
    )
    rows: list[dict[str, Any]] = []
    stats_list = payload.get("stats", [])
    if not stats_list:
        return rows

    for split in stats_list[0].get("splits", []):
        stat = split.get("stat", {})
        row: dict[str, Any] = {
            "season": split.get("season", SEASON),
            "group": group,
            "player_id": split.get("player", {}).get("id"),
            "player_name": split.get("player", {}).get("fullName"),
            "team_id": split.get("team", {}).get("id"),
            "team_name": split.get("team", {}).get("name"),
        }
        for key, value in stat.items():
            row[key] = coerce_value(value)
        rows.append(row)
    return rows


def fetch_and_write_live_games(session: requests.Session, schedule_rows: list[dict[str, Any]]) -> None:
    for row in schedule_rows:
        game_pk = row.get("game_pk")
        status = row.get("status")
        if not game_pk:
            continue
        if status not in {"In Progress", "Final", "Game Over"}:
            continue
        payload = request_json(session, f"/game/{game_pk}/feed/live")
        output = DATA_DIR / f"game_live_{game_pk}.json"
        output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        time.sleep(REQUEST_DELAY_SEC)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    session = requests.Session()

    print(f"[INFO] fetching MLB data for season={SEASON}, date={TARGET_DATE}")

    schedule_rows = fetch_schedule(session)
    time.sleep(REQUEST_DELAY_SEC)

    standings_rows = fetch_standings(session)
    time.sleep(REQUEST_DELAY_SEC)

    teams_rows = fetch_teams(session)
    time.sleep(REQUEST_DELAY_SEC)

    players_rows = fetch_players(session)
    time.sleep(REQUEST_DELAY_SEC)

    hitting_rows = fetch_player_group_stats(session, "hitting")
    time.sleep(REQUEST_DELAY_SEC)

    pitching_rows = fetch_player_group_stats(session, "pitching")
    time.sleep(REQUEST_DELAY_SEC)

    fielding_rows = fetch_player_group_stats(session, "fielding")
    time.sleep(REQUEST_DELAY_SEC)

    write_csv(DATA_DIR / "schedule.csv", schedule_rows)
    write_csv(DATA_DIR / "standings.csv", standings_rows)
    write_csv(DATA_DIR / "teams.csv", teams_rows)
    write_csv(DATA_DIR / "players.csv", players_rows)
    write_csv(DATA_DIR / "player_hitting.csv", hitting_rows)
    write_csv(DATA_DIR / "player_pitching.csv", pitching_rows)
    write_csv(DATA_DIR / "player_fielding.csv", fielding_rows)

    fetch_and_write_live_games(session, schedule_rows)

    (DATA_DIR / "last_updated.txt").write_text(
        datetime.now(timezone.utc).isoformat(),
        encoding="utf-8",
    )
    print("[INFO] data fetch completed")


if __name__ == "__main__":
    main()
