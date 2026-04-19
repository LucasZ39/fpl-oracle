import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error
from scipy.stats import spearmanr
import lightgbm as lgb
from features import load_data, build_features, FEATURE_COLS, TARGET_COL

# ── Baselines ─────────────────────────────────────────────────────────────────

def baseline_position_avg(df):
    """Predict the average points for that position."""
    pos_avg = df.groupby("position")[TARGET_COL].mean()
    return df["position"].map(pos_avg)

def baseline_player_rolling(df):
    """Predict each player's own last-5 average."""
    return df["rolling_pts_5"]

# ── Evaluation ────────────────────────────────────────────────────────────────

def evaluate(y_true, y_pred, label):
    mae = mean_absolute_error(y_true, y_pred)
    corr, _ = spearmanr(y_true, y_pred)
    print(f"{label:30s}  MAE={mae:.3f}  Spearman={corr:.3f}")
    return mae

# ── Training ──────────────────────────────────────────────────────────────────

def train():
    print("Loading data...")
    df = load_data()
    df = build_features(df)

    # hold out the last 8 gameweeks as final test set — never touch until the end
    max_gw = df["gameweekId"].max()
    test_gw_cutoff = max_gw - 7

    train_val_df = df[df["gameweekId"] <= test_gw_cutoff].copy()
    test_df = df[df["gameweekId"] > test_gw_cutoff].copy()

    print(f"Train/val rows: {len(train_val_df)}, Test rows: {len(test_df)}")

    X = train_val_df[FEATURE_COLS]
    y = train_val_df[TARGET_COL]

    # ── Cross-validation ──────────────────────────────────────────────────────
    tscv = TimeSeriesSplit(n_splits=5)
    val_maes = []

    for fold, (train_idx, val_idx) in enumerate(tscv.split(X)):
        X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
        y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]

        model = lgb.LGBMRegressor(
            n_estimators=300,
            learning_rate=0.05,
            num_leaves=31,
            random_state=42,
            verbose=-1
        )
        model.fit(X_train, y_train)
        preds = model.predict(X_val)
        mae = mean_absolute_error(y_val, preds)
        val_maes.append(mae)
        print(f"  Fold {fold+1} MAE: {mae:.3f}")

    print(f"Mean CV MAE: {np.mean(val_maes):.3f}")

    # ── Train final model on all train/val data ───────────────────────────────
    print("\nTraining final models...")

    # median model
    model_q50 = lgb.LGBMRegressor(
        n_estimators=300, learning_rate=0.05,
        num_leaves=31, random_state=42, verbose=-1
    )
    model_q50.fit(X, y)

    # quantile models for uncertainty intervals
    model_q10 = lgb.LGBMRegressor(
        objective="quantile", alpha=0.1,
        n_estimators=300, learning_rate=0.05,
        num_leaves=31, random_state=42, verbose=-1
    )
    model_q10.fit(X, y)

    model_q90 = lgb.LGBMRegressor(
        objective="quantile", alpha=0.9,
        n_estimators=300, learning_rate=0.05,
        num_leaves=31, random_state=42, verbose=-1
    )
    model_q90.fit(X, y)

    # ── Evaluate on held-out test set ─────────────────────────────────────────
    print("\n── Test set evaluation ──────────────────────────────")
    X_test = test_df[FEATURE_COLS]
    y_test = test_df[TARGET_COL]

    evaluate(y_test, baseline_position_avg(test_df), "Baseline: position avg")
    evaluate(y_test, baseline_player_rolling(test_df), "Baseline: player rolling avg")
    evaluate(y_test, model_q50.predict(X_test), "LightGBM (median)")

    # interval coverage
    preds_q10 = model_q10.predict(X_test)
    preds_q90 = model_q90.predict(X_test)
    coverage = ((y_test >= preds_q10) & (y_test <= preds_q90)).mean()
    print(f"\n80% interval coverage: {coverage:.1%} (target: ~80%)")

    # ── Save models ───────────────────────────────────────────────────────────
    os.makedirs("models", exist_ok=True)
    joblib.dump(model_q50, "models/model_q50.joblib")
    joblib.dump(model_q10, "models/model_q10.joblib")
    joblib.dump(model_q90, "models/model_q90.joblib")
    print("\nModels saved to models/")

if __name__ == "__main__":
    train()