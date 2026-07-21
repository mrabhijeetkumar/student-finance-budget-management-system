# recurring_routes.py
from datetime import date

from flask import Blueprint, g, request

from middleware.auth_middleware import token_required
from utils.date_helper import advance_date, days_until, is_overdue
from utils.db import get_db
from utils.response_helper import error_response, success_response

recurring_bp = Blueprint("recurring", __name__, url_prefix="/api/recurring")

VALID_FREQUENCIES = {"daily", "weekly", "monthly", "yearly"}


def _serialize(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "category": row["category"],
        "amount": float(row["amount"]),
        "frequency": row["frequency"],
        "next_due_date": row["next_due_date"],
        "is_active": bool(row["is_active"]),
        "is_overdue": bool(row["is_active"]) and is_overdue(row["next_due_date"]),
        "days_until_due": days_until(row["next_due_date"]),
    }


@recurring_bp.route("", methods=["GET"])
@token_required
def get_recurring():
    db = get_db()
    rows = db.execute(
        "SELECT id, title, category, amount, frequency, next_due_date, is_active FROM recurring_expenses "
        "WHERE user_id = ? ORDER BY next_due_date ASC",
        (g.user_id,),
    ).fetchall()

    items = [_serialize(row) for row in rows]
    monthly_total = sum(item["amount"] for item in items if item["is_active"] and item["frequency"] == "monthly")

    return success_response("Recurring transactions fetched", {
        "items": items,
        "active_count": sum(1 for item in items if item["is_active"]),
        "monthly_committed": round(monthly_total, 2),
    })


@recurring_bp.route("", methods=["POST"])
@token_required
def create_recurring():
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    category = (data.get("category") or "").strip()
    amount = data.get("amount")
    frequency = (data.get("frequency") or "monthly").strip().lower()
    next_due_date = (data.get("next_due_date") or "").strip() or date.today().isoformat()

    if not title or not category or amount is None:
        return error_response("Title, category, and amount are required", 400)

    if frequency not in VALID_FREQUENCIES:
        return error_response("Frequency must be one of daily, weekly, monthly, yearly", 400)

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return error_response("Amount must be a number", 400)

    if amount <= 0:
        return error_response("Amount must be greater than zero", 400)

    db = get_db()
    db.execute(
        "INSERT INTO recurring_expenses (user_id, title, category, amount, frequency, next_due_date, is_active) "
        "VALUES (?, ?, ?, ?, ?, ?, 1)",
        (g.user_id, title, category, amount, frequency, next_due_date),
    )
    db.commit()

    return success_response("Recurring transaction created", None, 201)


@recurring_bp.route("/<int:id>", methods=["PUT"])
@token_required
def update_recurring(id):
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    category = (data.get("category") or "").strip()
    amount = data.get("amount")
    frequency = (data.get("frequency") or "monthly").strip().lower()
    next_due_date = (data.get("next_due_date") or "").strip()

    if not title or not category or amount is None or not next_due_date:
        return error_response("Title, category, amount, and next due date are required", 400)

    if frequency not in VALID_FREQUENCIES:
        return error_response("Frequency must be one of daily, weekly, monthly, yearly", 400)

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return error_response("Amount must be a number", 400)

    db = get_db()
    existing = db.execute(
        "SELECT id FROM recurring_expenses WHERE id = ? AND user_id = ?", (id, g.user_id)
    ).fetchone()
    if not existing:
        return error_response("Recurring transaction not found", 404)

    db.execute(
        "UPDATE recurring_expenses SET title = ?, category = ?, amount = ?, frequency = ?, next_due_date = ? "
        "WHERE id = ? AND user_id = ?",
        (title, category, amount, frequency, next_due_date, id, g.user_id),
    )
    db.commit()

    return success_response("Recurring transaction updated")


@recurring_bp.route("/<int:id>/toggle", methods=["PUT"])
@token_required
def toggle_recurring(id):
    db = get_db()
    row = db.execute(
        "SELECT is_active FROM recurring_expenses WHERE id = ? AND user_id = ?", (id, g.user_id)
    ).fetchone()

    if not row:
        return error_response("Recurring transaction not found", 404)

    new_state = 0 if row["is_active"] else 1
    db.execute(
        "UPDATE recurring_expenses SET is_active = ? WHERE id = ? AND user_id = ?", (new_state, id, g.user_id)
    )
    db.commit()

    return success_response("Recurring transaction updated", {"is_active": bool(new_state)})


@recurring_bp.route("/<int:id>/mark-paid", methods=["POST"])
@token_required
def mark_recurring_paid(id):
    db = get_db()
    row = db.execute(
        "SELECT id, title, category, amount, frequency, next_due_date FROM recurring_expenses "
        "WHERE id = ? AND user_id = ?",
        (id, g.user_id),
    ).fetchone()

    if not row:
        return error_response("Recurring transaction not found", 404)

    today = date.today().isoformat()
    db.execute(
        "INSERT INTO expenses (user_id, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
        (g.user_id, float(row["amount"]), row["category"], today, f"Recurring: {row['title']}"),
    )

    next_due = advance_date(row["next_due_date"], row["frequency"])
    db.execute(
        "UPDATE recurring_expenses SET next_due_date = ? WHERE id = ? AND user_id = ?",
        (next_due, id, g.user_id),
    )
    db.commit()

    return success_response("Marked as paid and logged as an expense", {"next_due_date": next_due})


@recurring_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_recurring(id):
    db = get_db()
    deleted = db.execute(
        "DELETE FROM recurring_expenses WHERE id = ? AND user_id = ?", (id, g.user_id)
    ).rowcount
    db.commit()

    if deleted == 0:
        return error_response("Recurring transaction not found", 404)

    return success_response("Recurring transaction deleted")
