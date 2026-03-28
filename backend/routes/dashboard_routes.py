from datetime import date
from flask import Blueprint, g, request
from utils.db import get_db
from utils.response_helper import success_response
from middleware.auth_middleware import token_required
from services.analytics_service import (
    build_dashboard_analytics,
    build_dashboard_kpis,
    build_expense_prediction,
    build_smart_insights,
    generate_smart_insights,
    get_dashboard_analytics,
    get_dashboard_kpis,
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
    month = request.args.get("month")
    analytics = get_dashboard_analytics(db, g.user_id, month=month)
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


@dashboard_bp.route("/kpis", methods=["GET"])
@token_required
def dashboard_kpis():
    db = get_db()
    kpis = get_dashboard_kpis(db, g.user_id)
    return success_response("Dashboard KPIs", kpis)


@dashboard_bp.route("/overview", methods=["GET"])
@token_required
def dashboard_overview():
    db = get_db()
    month = request.args.get("month") or f"{date.today().year}-{date.today().month:02d}"

    total_income = db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ?",
        (g.user_id,),
    ).fetchone()["total"]

    total_expense = db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?",
        (g.user_id,),
    ).fetchone()["total"]

    expenses = db.execute(
        "SELECT amount, category, date FROM expenses WHERE user_id = ? ORDER BY date ASC",
        (g.user_id,),
    ).fetchall()
    incomes = db.execute(
        "SELECT amount, date FROM incomes WHERE user_id = ? ORDER BY date ASC",
        (g.user_id,),
    ).fetchall()

    analytics = build_dashboard_analytics(expenses, incomes, month=month)
    insights = build_smart_insights(expenses)
    prediction = build_expense_prediction(expenses)
    kpis = build_dashboard_kpis(expenses, incomes)

    budget_rows = db.execute(
        "SELECT id, month, category, amount FROM budgets WHERE user_id = ? AND month = ? ORDER BY category ASC",
        (g.user_id, month),
    ).fetchall()
    expense_rows = db.execute(
        "SELECT category, COALESCE(SUM(amount),0) as spent FROM expenses WHERE user_id = ? AND substr(date,1,7) = ? GROUP BY category",
        (g.user_id, month),
    ).fetchall()

    spent_map = {row["category"]: float(row["spent"]) for row in expense_rows}
    budget_items = []
    for row in budget_rows:
        amount = float(row["amount"])
        spent = spent_map.get(row["category"], 0.0)
        usage = (spent / amount * 100) if amount else 0
        status = "safe"
        if usage >= 100:
            status = "exceeded"
        elif usage >= 80:
            status = "warning"

        budget_items.append({
            "id": row["id"],
            "month": row["month"],
            "category": row["category"],
            "amount": amount,
            "spent": round(spent, 2),
            "usage_percent": round(usage, 2),
            "status": status,
        })

    return success_response("Dashboard overview", {
        "summary": {
            "total_income": round(float(total_income), 2),
            "total_expense": round(float(total_expense), 2),
            "balance": round(float(total_income) - float(total_expense), 2),
        },
        "analytics": analytics,
        "insights": insights,
        "prediction": prediction,
        "kpis": kpis,
        "budgets": {
            "month": month,
            "items": budget_items,
            "total_budget": round(sum(item["amount"] for item in budget_items), 2),
            "total_spent": round(sum(item["spent"] for item in budget_items), 2),
        },
    })
