import json
import sys
import warnings
from pathlib import Path

import joblib
import pandas as pd

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent

model = joblib.load(BASE_DIR / "churnsense_model.pkl")
scaler = joblib.load(BASE_DIR / "scaler.pkl")
raw_cols = joblib.load(BASE_DIR / "feature_columns.pkl")
feature_columns = list(raw_cols)


def get_target_columns() -> list[str]:
    if hasattr(model, "feature_names_in_"):
        return list(model.feature_names_in_)
    return feature_columns


def build_feature_row(payload: dict) -> pd.DataFrame:
    target_cols = get_target_columns()
    row = {col: 0.0 for col in target_cols}

    # Numeric fields
    numeric_fields = ["tenure", "MonthlyCharges", "TotalCharges", "SeniorCitizen"]
    for field in numeric_fields:
        if field in payload and payload[field] is not None and payload[field] != "":
            try:
                val = float(payload[field])
                if field in row:
                    row[field] = val
            except (ValueError, TypeError):
                pass

    # Categorical fields -> match dummy column names like "<col>_<value>"
    categorical_fields = [
        "Contract",
        "InternetService",
        "PaymentMethod",
        "TechSupport",
        "PaperlessBilling",
    ]
    for col in categorical_fields:
        val = payload.get(col)
        if val is not None:
            if col in row:
                try:
                    row[col] = float(val)
                except (ValueError, TypeError):
                    pass

            dummy_col = f"{col}_{val}"
            if dummy_col in row:
                row[dummy_col] = 1.0

    df = pd.DataFrame([row], columns=target_cols)

    # Apply scaler only to the columns scaler was fitted on
    if hasattr(scaler, "feature_names_in_"):
        scaler_cols = list(scaler.feature_names_in_)
        for col in scaler_cols:
            if col not in df.columns:
                df[col] = 0.0
        df[scaler_cols] = scaler.transform(df[scaler_cols])

    return df


def run_prediction(payload: dict) -> dict:
    X_df = build_feature_row(payload)

    pred = int(model.predict(X_df)[0])
    if hasattr(model, "predict_proba"):
        proba = float(model.predict_proba(X_df)[0][1])
    else:
        proba = float(pred)

    return {
        "prediction": pred,
        "churn_probability": round(proba, 4),
    }


if __name__ == "__main__":
    raw_input = sys.stdin.read()
    data = json.loads(raw_input) if raw_input.strip() else {}
    result = run_prediction(data)
    print(json.dumps(result))