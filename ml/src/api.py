import os
import sys
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from dotenv import load_dotenv

load_dotenv()

sys.path.append(os.path.dirname(__file__))
from features import load_data, build_features, FEATURE_COLS
from explain import get_shap_values, get_player_explanation

app = FastAPI(title="FPL Oracle ML Service")

# load models once at startup
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
model_q50 = joblib.load(os.path.join(MODEL_DIR, "model_q50.joblib"))
model_q10 = joblib.load(os.path.join(MODEL_DIR, "model_q10.joblib"))
model_q90 = joblib.load(os.path.join(MODEL_DIR, "model_q90.joblib"))

# load and cache feature data
print("Loading feature data...")
_df = load_data()
_df = build_features(_df)
_shap_values, _X = get_shap_values(_df, model_q50)
print("Ready.")

ML_API_KEY = os.getenv("ML_API_KEY", "dev-key")

def check_key(x_api_key: str = Header(default=None)):
    if x_api_key != ML_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

@app.get("/health")
def health():
    return {"ok": True, "service": "ml", "rows": len(_df)}

@app.get("/predict/gameweek/{gw_id}")
def predict_gameweek(gw_id: int, x_api_key: str = Header(default=None)):
    check_key(x_api_key)

    gw_df = _df[_df["gameweekId"] == gw_id].copy()
    if gw_df.empty:
        raise HTTPException(status_code=404, detail=f"No data for gameweek {gw_id}")

    X = gw_df[FEATURE_COLS]
    gw_df["predicted_pts"] = model_q50.predict(X).round(2)
    gw_df["q10"] = model_q10.predict(X).round(2)
    gw_df["q90"] = model_q90.predict(X).round(2)

    return gw_df[["playerId", "predicted_pts", "q10", "q90", "ownership", "position"]].to_dict(orient="records")

@app.get("/differentials")
def differentials(gameweek_id: int, x_api_key: str = Header(default=None)):
    check_key(x_api_key)

    gw_df = _df[_df["gameweekId"] == gameweek_id].copy()
    if gw_df.empty:
        raise HTTPException(status_code=404, detail=f"No data for gameweek {gameweek_id}")

    X = gw_df[FEATURE_COLS]
    gw_df["predicted_pts"] = model_q50.predict(X).round(2)
    gw_df["q10"] = model_q10.predict(X).round(2)
    gw_df["q90"] = model_q90.predict(X).round(2)

    # position thresholds for "good" predicted points
    thresholds = {1: 3.5, 2: 3.5, 3: 4.5, 4: 4.5}
    gw_df["threshold"] = gw_df["position"].map(thresholds)

    diffs = gw_df[
        (gw_df["ownership"] < 10) &
        (gw_df["predicted_pts"] > gw_df["threshold"])
    ].copy()

    diffs = diffs.sort_values("predicted_pts", ascending=False).head(20)

    results = []
    for _, row in diffs.iterrows():
        explanation = get_player_explanation(
            int(row["playerId"]), int(row["gameweekId"]),
            _df, _shap_values, _X
        )
        results.append({
            "playerId": int(row["playerId"]),
            "predicted_pts": row["predicted_pts"],
            "q10": row["q10"],
            "q90": row["q90"],
            "ownership": row["ownership"],
            "position": int(row["position"]),
            "explanation": explanation
        })

    return results