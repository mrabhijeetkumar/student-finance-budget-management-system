from flask import Blueprint, request, g
from utils.db import get_db
from utils.response_helper import success_response, error_response
from middleware.auth_middleware import token_required

expense_bp = Blueprint("expenses", __name__, url_prefix="/api/expenses")


@expense_bp.route("", methods=["GET"])
@token_required
def get_expenses():
    db = get_db()

    category = request.args.get("category", "").strip()
    start_date = request.args.get("start_date", "").strip()
    end_date = request.args.get("end_date", "").strip()
    q = request.args.get("q", "").strip().lower()

    query = "SELECT id, amount, category, date, note FROM expenses WHERE user_id = ?"
    params = [g.user_id]

    if category and category.lower() != "all":
        query += " AND category = ?"
        params.append(category)

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    if q:
        query += " AND (LOWER(category) LIKE ? OR LOWER(COALESCE(note, '')) LIKE ?)"
        keyword = f"%{q}%"
        params.extend([keyword, keyword])

    query += " ORDER BY date DESC, id DESC"
    expenses = db.execute(query, tuple(params)).fetchall()

    result = [dict(row) for row in expenses]
    return success_response("Expenses fetched successfully", result)


@expense_bp.route("", methods=["POST"])
@token_required
def add_expense():
    data = request.get_json() or {}

    amount = data.get("amount")
    category = (data.get("category") or "").strip()
    date = (data.get("date") or "").strip()
    note = (data.get("note") or "").strip()

    if not amount or not category or not date:
        return error_response("Amount, category, and date are required", 400)

    db = get_db()
    db.execute(
        "INSERT INTO expenses (user_id, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
        (g.user_id, amount, category, date, note),
    )
    db.commit()

    return success_response("Expense added successfully", None, 201)


@expense_bp.route("/<int:id>", methods=["PUT"])
@token_required
def update_expense(id):
    data = request.get_json() or {}

    amount = data.get("amount")
    category = (data.get("category") or "").strip()
    date = (data.get("date") or "").strip()
    note = (data.get("note") or "").strip()

    if not amount or not category or not date:
        return error_response("Amount, category, and date are required", 400)

    db = get_db()
    existing = db.execute("SELECT id FROM expenses WHERE id = ? AND user_id = ?", (id, g.user_id)).fetchone()

    if not existing:
        return error_response("Expense not found", 404)

    db.execute(
        "UPDATE expenses SET amount = ?, category = ?, date = ?, note = ? WHERE id = ? AND user_id = ?",
        (amount, category, date, note, id, g.user_id),
    )
    db.commit()

    return success_response("Expense updated successfully")


@expense_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_expense(id):
    db = get_db()

    existing = db.execute("SELECT id FROM expenses WHERE id = ? AND user_id = ?", (id, g.user_id)).fetchone()
    if not existing:
        return error_response("Expense not found", 404)

    db.execute("DELETE FROM expenses WHERE id = ? AND user_id = ?", (id, g.user_id))
    db.commit()

    return success_response("Expense deleted successfully")
