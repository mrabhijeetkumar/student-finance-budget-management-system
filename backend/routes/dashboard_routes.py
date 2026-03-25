# dashboard_routes.py
from flask import Blueprint, g
from utils.db import get_db
from utils.response_helper import success_response
from middleware.auth_middleware import token_required

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("/summary", methods=["GET"])
@token_required
def get_summary():
    db = get_db()

    total_income = db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ?",
        (g.user_id,)
    ).fetchone()["total"]

    total_expense = db.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ?",
        (g.user_id,)
    ).fetchone()["total"]

    balance = total_income - total_expense

    return success_response("Dashboard summary", {
        "total_income": total_income,
        "total_expense": total_expense,
        "balance": balance
    })