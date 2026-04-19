import os
import joblib
import shap
import pandas as pd
import numpy as np
from features import load_data, build_features, FEATURE_COLS

def load_model():
    return joblib.load("models/model_q50.joblib")

def get_shap_values(df, model):
    X = df[FEATURE_COLS]
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X)
    return shap_values, X

def get_player_explanation(player_id, gameweek_id, df, shap_values, X):
    """Return top 5 feature contributions for a specific player-gameweek."""
    mask = (df["playerId"] == player_id) & (df["gameweekId"] == gameweek_id)
    idx = df[mask].index

    if len(idx) == 0:
        return None

    i = X.index.get_loc(idx[0])
    contributions = dict(zip(FEATURE_COLS, shap_values[i]))

    # sort by absolute contribution
    sorted_contributions = sorted(
        contributions.items(),
        key=lambda x: abs(x[1]),
        reverse=True
    )[:5]

    return [
        {"feature": feat, "contribution": round(val, 3)}
        for feat, val in sorted_contributions
    ]

def print_global_importance(model):
    importance = dict(zip(FEATURE_COLS, model.feature_importances_))
    sorted_imp = sorted(importance.items(), key=lambda x: x[1], reverse=True)
    print("\nGlobal feature importance:")
    for feat, imp in sorted_imp:
        bar = "█" * int(imp / 20)
        print(f"  {feat:30s} {imp:6.0f}  {bar}")

if __name__ == "__main__":
    print("Loading data and model...")
    df = load_data()
    df = build_features(df)
    model = load_model()

    print_global_importance(model)

    # show explanation for Haaland's most recent gameweek
    haaland_id = 430
    latest_gw = df[df["playerId"] == haaland_id]["gameweekId"].max()

    shap_values, X = get_shap_values(df, model)
    explanation = get_player_explanation(haaland_id, latest_gw, df, shap_values, X)

    print(f"\nHaaland (GW{latest_gw}) top feature contributions:")
    for e in explanation:
        sign = "+" if e["contribution"] > 0 else ""
        print(f"  {e['feature']:30s} {sign}{e['contribution']}")