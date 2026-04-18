import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from fpl_client import get_bootstrap, get_fixtures

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def upsert_teams(teams):
    with engine.begin() as conn:
        for t in teams:
            conn.execute(text("""
                INSERT INTO "Team" (id, name, "shortName")
                VALUES (:id, :name, :short)
                ON CONFLICT (id) DO UPDATE
                SET name = EXCLUDED.name, "shortName" = EXCLUDED."shortName"
            """), {"id": t["id"], "name": t["name"], "short": t["short_name"]})
    print(f"Upserted {len(teams)} teams")

def upsert_players(players):
    with engine.begin() as conn:
        for p in players:
            conn.execute(text("""
                INSERT INTO "Player" (id, "webName", "teamId", position, price, ownership)
                VALUES (:id, :webName, :teamId, :position, :price, :ownership)
                ON CONFLICT (id) DO UPDATE
                SET "webName" = EXCLUDED."webName",
                    "teamId" = EXCLUDED."teamId",
                    price = EXCLUDED.price,
                    ownership = EXCLUDED.ownership
            """), {
                "id": p["id"],
                "webName": p["web_name"],
                "teamId": p["team"],
                "position": p["element_type"],
                "price": p["now_cost"],
                "ownership": float(p["selected_by_percent"])
            })
    print(f"Upserted {len(players)} players")

def upsert_gameweeks(gameweeks):
    with engine.begin() as conn:
        for g in gameweeks:
            conn.execute(text("""
                INSERT INTO "Gameweek" (id, name, deadline, finished)
                VALUES (:id, :name, :deadline, :finished)
                ON CONFLICT (id) DO UPDATE
                SET finished = EXCLUDED.finished
            """), {
                "id": g["id"],
                "name": g["name"],
                "deadline": g["deadline_time"],
                "finished": g["finished"]
            })
    print(f"Upserted {len(gameweeks)} gameweeks")

def upsert_fixtures(fixtures):
    with engine.begin() as conn:
        for f in fixtures:
            if f.get("event") is None:
                continue
            conn.execute(text("""
                INSERT INTO "Fixture" (id, "gameweekId", "homeTeamId", "awayTeamId")
                VALUES (:id, :gameweekId, :homeTeamId, :awayTeamId)
                ON CONFLICT (id) DO NOTHING
            """), {
                "id": f["id"],
                "gameweekId": f["event"],
                "homeTeamId": f["team_h"],
                "awayTeamId": f["team_a"]
            })
    print(f"Upserted fixtures")

if __name__ == "__main__":
    print("Fetching FPL data...")
    data = get_bootstrap()
    
    upsert_teams(data["teams"])
    upsert_gameweeks(data["events"])
    upsert_players(data["elements"])
    
    fixtures = get_fixtures()
    upsert_fixtures(fixtures)
    
    print("Done!")