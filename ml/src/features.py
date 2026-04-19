import os
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

engine = create_engine(os.getenv("DATABASE_URL"))

def load_data():
    query = """
        SELECT 
            s."playerId",
            s."gameweekId",
            s.minutes,
            s.points,
            s.goals,
            s.assists,
            s.bonus,
            p.position,
            p.price,
            p.ownership,
            p."teamId"
        FROM "PlayerGameweekStats" s
        JOIN "Player" p ON s."playerId" = p.id
        ORDER BY s."playerId", s."gameweekId"
    """
    df = pd.read_sql(query, engine)
    return df

def build_features(df):
    df = df.copy().sort_values(["playerId", "gameweekId"])

    # rolling form features — shift(1) so we never leak current GW data
    for window in [3, 5, 10]:
        df[f"rolling_pts_{window}"] = (
            df.groupby("playerId")["points"]
            .transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
        )
        df[f"rolling_goals_{window}"] = (
            df.groupby("playerId")["goals"]
            .transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
        )
        df[f"rolling_assists_{window}"] = (
            df.groupby("playerId")["assists"]
            .transform(lambda x: x.shift(1).rolling(window, min_periods=1).mean())
        )

    # minutes reliability — how often does this player play?
    df["rolling_minutes_5"] = (
        df.groupby("playerId")["minutes"]
        .transform(lambda x: x.shift(1).rolling(5, min_periods=1).mean())
    )
    df["is_starter"] = (df["rolling_minutes_5"] > 60).astype(int)

    # position dummies
    df["is_gk"] = (df["position"] == 1).astype(int)
    df["is_def"] = (df["position"] == 2).astype(int)
    df["is_mid"] = (df["position"] == 3).astype(int)
    df["is_fwd"] = (df["position"] == 4).astype(int)

    # price in millions
    df["price_m"] = df["price"] / 10.0

    # drop rows with no history (first GW for each player)
    df = df.dropna(subset=["rolling_pts_3"])

    return df

FEATURE_COLS = [
    "rolling_pts_3", "rolling_pts_5", "rolling_pts_10",
    "rolling_goals_3", "rolling_goals_5",
    "rolling_assists_3", "rolling_assists_5",
    "rolling_minutes_5", "is_starter",
    "is_gk", "is_def", "is_mid", "is_fwd",
    "price_m", "ownership"
]

TARGET_COL = "points"

if __name__ == "__main__":
    print("Loading data...")
    df = load_data()
    print(f"Loaded {len(df)} rows")

    print("Building features...")
    df = build_features(df)
    print(f"Feature matrix: {df.shape}")
    print(df[FEATURE_COLS].describe())