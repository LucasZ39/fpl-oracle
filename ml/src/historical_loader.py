import os
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

SEASONS = ["2021-22", "2022-23", "2023-24", "2024-25"]

def get_valid_ids():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        player_ids = {row[0] for row in conn.execute(text('SELECT id FROM "Player"'))}
        gameweek_ids = {row[0] for row in conn.execute(text('SELECT id FROM "Gameweek"'))}
    engine.dispose()
    return player_ids, gameweek_ids

def load_season(data_dir, season_label, valid_players, valid_gameweeks):
    filepath = os.path.join(data_dir, season_label, "gws", "merged_gw.csv")

    if not os.path.exists(filepath):
        print(f"Skipping {season_label} — file not found")
        return 0

    df = pd.read_csv(filepath, encoding="latin-1")

    rows = []
    for _, row in df.iterrows():
        try:
            pid = int(row.get("element", 0))
            gid = int(row.get("GW", 0))
            if pid not in valid_players or gid not in valid_gameweeks:
                continue
            rows.append({
                "playerId": pid,
                "gameweekId": gid,
                "minutes": int(row.get("minutes", 0)),
                "points": int(row.get("total_points", 0)),
                "goals": int(row.get("goals_scored", 0)),
                "assists": int(row.get("assists", 0)),
                "bonus": int(row.get("bonus", 0)),
            })
        except Exception:
            continue

    batch_size = 500
    loaded = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i+batch_size]
        # fresh connection per batch
        engine = create_engine(DATABASE_URL)
        try:
            with engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO "PlayerGameweekStats"
                    ("playerId", "gameweekId", minutes, points, goals, assists, bonus)
                    VALUES (:playerId, :gameweekId, :minutes, :points, :goals, :assists, :bonus)
                    ON CONFLICT ("playerId", "gameweekId") DO NOTHING
                """), batch)
            loaded += len(batch)
            print(f"  {season_label}: {loaded}/{len(rows)} rows...", end="\r")
        except Exception as e:
            print(f"\n  Error on batch {i}: {e}")
        finally:
            engine.dispose()

    print(f"\nLoaded {loaded} rows for {season_label}")
    return loaded

if __name__ == "__main__":
    data_dir = input("Paste the full path to your Fantasy-Premier-League-master/data folder: ").strip()

    print("Loading valid player and gameweek IDs...")
    valid_players, valid_gameweeks = get_valid_ids()
    print(f"Found {len(valid_players)} players, {len(valid_gameweeks)} gameweeks")

    total = 0
    for season in SEASONS:
        total += load_season(data_dir, season, valid_players, valid_gameweeks)

    print(f"\nDone! Total rows loaded: {total}")