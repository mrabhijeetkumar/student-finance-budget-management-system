from flask import Blueprint, g
from utils.db import get_db
from utils.response_helper import success_response
from middleware.auth_middleware import token_required
from services.analytics_service import (
    generate_smart_insights,
    get_dashboard_analytics,
    predict_next_month_expense,
)

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("/summary", methods=["GET"])
@token_required
def get_summary():
    db = get_db()

    total_income = db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ?",
        (g.user_id,),
    ).fetchone()["total"]

    total_expense = db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?",
        (g.user_id,),
    ).fetchone()["total"]

    balance = float(total_income) - float(total_expense)

    return success_response("Dashboard summary", {
        "total_income": round(float(total_income), 2),
        "total_expense": round(float(total_expense), 2),
        "balance": round(balance, 2),
    })


@dashboard_bp.route("/analytics", methods=["GET"])
@token_required
def dashboard_analytics():
    db = get_db()
    analytics = get_dashboard_analytics(db, g.user_id)
    return success_response("Analytics data", analytics)


@dashboard_bp.route("/insights", methods=["GET"])
@token_required
def dashboard_insights():
    db = get_db()
    insights = generate_smart_insights(db, g.user_id)
    return success_response("Smart insights", {"insights": insights})


@dashboard_bp.route("/prediction", methods=["GET"])
@token_required
def expense_prediction():
    db = get_db()
    prediction = predict_next_month_expense(db, g.user_id)
    return success_response("Expense prediction", prediction)
