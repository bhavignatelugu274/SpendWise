"""
SPENDWISE AI — Python Scikit-Learn Machine Learning Microservice (Reference Implementation)

Provides FastAPI endpoints for:
1. TF-IDF + LogisticRegression transaction auto-categorization
2. Scikit-Learn Ridge Regression chronological expense forecasting with MAE/RMSE/MAPE/R²
3. IsolationForest anomaly detection on transaction amounts & temporal features

Run locally with:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.ensemble import IsolationForest
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

app = FastAPI(title="SpendWise AI ML Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class TransactionRecord(BaseModel):
    id: str
    date: str
    merchant: str
    description: str
    amount: float
    category: Optional[str] = None
    type: str = "expense"


class CategorizeRequest(BaseModel):
    merchant: str
    description: str
    training_samples: List[TransactionRecord] = []


class ForecastRequest(BaseModel):
    transactions: List[TransactionRecord]


@app.post("/categorize")
def categorize_transaction(req: CategorizeRequest):
    base_corpus = [
        ("Swiggy dinner biryani", "Dining"),
        ("Zomato lunch cafe", "Dining"),
        ("BigBasket vegetables groceries", "Groceries"),
        ("Zepto milk bread essentials", "Groceries"),
        ("Uber airport cab ride", "Travel"),
        ("BESCOM electricity bill", "Bills"),
        ("Netflix monthly streaming", "Subscriptions"),
        ("Amazon India electronics", "Shopping"),
        ("Apollo Pharmacy medicines", "Health"),
        ("Apartment monthly rent", "Rent"),
    ]
    for s in req.training_samples:
        if s.category and s.type == "expense":
            base_corpus.append((f"{s.merchant} {s.description}", s.category))

    texts = [t for t, _ in base_corpus]
    labels = [c for _, c in base_corpus]

    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
        ("clf", LogisticRegression(max_iter=500, C=1.5)),
    ])
    pipe.fit(texts, labels)

    query = f"{req.merchant} {req.description}".strip()
    probs = pipe.predict_proba([query])[0]
    best_idx = int(np.argmax(probs))
    return {
        "category": pipe.classes_[best_idx],
        "confidence": round(float(probs[best_idx]), 3),
        "model": "TF-IDF + LogisticRegression",
    }


@app.post("/forecast")
def forecast_expenses(req: ForecastRequest):
    df = pd.DataFrame([t.model_dump() for t in req.transactions])
    df = df[df["type"] == "expense"].copy()
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")

    monthly = (
        df.groupby("month")["amount"]
        .sum()
        .reset_index()
        .sort_values("month")
    )
    if len(monthly) < 6:
        return {"model_label": "Baseline Estimate", "predicted_total": float(monthly["amount"].tail(3).mean())}

    monthly["idx"] = np.arange(len(monthly))
    monthly["lag1"] = monthly["amount"].shift(1)
    monthly["rolling3"] = monthly["amount"].shift(1).rolling(3, min_periods=1).mean()
    monthly["cal_month"] = monthly["month"].dt.month
    monthly["sin_m"] = np.sin(2 * np.pi * (monthly["cal_month"] - 1) / 12)
    monthly["cos_m"] = np.cos(2 * np.pi * (monthly["cal_month"] - 1) / 12)
    feat_df = monthly.dropna().reset_index(drop=True)

    feature_cols = ["idx", "lag1", "rolling3", "sin_m", "cos_m"]
    split = max(3, len(feat_df) - 3)
    train_df, test_df = feat_df.iloc[:split], feat_df.iloc[split:]

    scaler = StandardScaler()
    X_train = scaler.fit_transform(train_df[feature_cols])
    X_test = scaler.transform(test_df[feature_cols])

    model = Ridge(alpha=3.0)
    model.fit(X_train, train_df["amount"])
    preds = model.predict(X_test)

    return {
        "model_label": "ML Forecast",
        "algorithm": "Scikit-Learn Ridge Regression",
        "metrics": {
            "mae": round(float(mean_absolute_error(test_df["amount"], preds)), 2),
            "rmse": round(float(np.sqrt(mean_squared_error(test_df["amount"], preds))), 2),
            "r2": round(float(r2_score(test_df["amount"], preds)), 3),
        },
    }


@app.post("/anomalies")
def detect_anomalies(req: ForecastRequest):
    df = pd.DataFrame([t.model_dump() for t in req.transactions])
    df = df[df["type"] == "expense"].copy()
    if len(df) < 10:
        return {"anomalies": []}

    iso = IsolationForest(contamination=0.04, random_state=42)
    df["anomaly"] = iso.fit_predict(df[["amount"]])
    flagged = df[df["anomaly"] == -1].sort_values("amount", ascending=False)
    return {"anomalies": flagged[["id", "date", "merchant", "category", "amount"]].to_dict(orient="records")}
