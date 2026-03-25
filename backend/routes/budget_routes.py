from datetime import date
from flask import Blueprint, g, request

from middleware.auth_middleware import token_required
from utils.db import get_db
from utils.response_helper import error_response, success_response

budget_bp = Blueprint("budgets", __name__, url_prefix="/api/budgets")


@budget_bp.route("", methods=["GET"])
@token_required
def get_budgets():
    month = request.args.get("month") or f"{date.today().year}-{date.today().month:02d}"
    db = get_db()
    rows = db.execute(
        "SELECT id, month, category, amount FROM budgets WHERE user_id = ? AND month = ? ORDER BY category ASC",
        (g.user_id, month),
    ).fetchall()

    expenses = db.execute(
        "SELECT category, COALESCE(SUM(amount),0) as spent FROM expenses WHERE user_id = ? AND substr(date,1,7) = ? GROUP BY category",
        (g.user_id, month),
    ).fetchall()

    spent_map = {row["category"]: float(row["spent"]) for row in expenses}
    result = []
    for row in rows:
        amount = float(row["amount"])
        spent = spent_map.get(row["category"], 0.0)
        usage = (spent / amount * 100) if amount else 0
        status = "safe"
        if usage >= 100:
            status = "exceeded"
        elif usage >= 80:
            status = "warning"

        result.append({
            "id": row["id"],
            "month": row["month"],
            "category": row["category"],
            "amount": amount,
            "spent": round(spent, 2),
            "usage_percent": round(usage, 2),
            "status": status,
        })

    total_budget = sum(item["amount"] for item in result)
    total_spent = sum(item["spent"] for item in result)
    return success_response("Budgets fetched", {
        "month": month,
        "items": result,
        "total_budget": round(total_budget, 2),
        "total_spent": round(total_spent, 2),
    })


@budget_bp.route("", methods=["POST"])
@token_required
def upsert_budget():
    data = request.get_json() or {}
    month = (data.get("month") or f"{date.today().year}-{date.today().month:02d}").strip()
    category = (data.get("category") or "").strip()
    amount = data.get("amount")

    if not category or amount is None:
        return error_response("Category and amount are required", 400)

    db = get_db()
    existing = db.execute(
        "SELECT id FROM budgets WHERE user_id = ? AND month = ? AND category = ?",
        (g.user_id, month, category),
    ).fetchone()

    if existing:
        db.execute("UPDATE budgets SET amount = ? WHERE id = ?", (amount, existing["id"]))
    else:
        db.execute(
            "INSERT INTO budgets (user_id, month, category, amount) VALUES (?, ?, ?, ?)",
            (g.user_id, month, category, amount),
        )

    db.commit()
    return success_response("Budget saved successfully")


@budget_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_budget(id):
    db = get_db()
    deleted = db.execute("DELETE FROM budgets WHERE id = ? AND user_id = ?", (id, g.user_id)).rowcount
    db.commit()

    if deleted == 0:
        return error_response("Budget record not found", 404)

    return success_response("Budget deleted")
