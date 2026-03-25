# expense_routes.py
from flask import Blueprint, request, g
from utils.db import get_db
from utils.response_helper import success_response, error_response
from middleware.auth_middleware import token_required

expense_bp = Blueprint("expenses", __name__, url_prefix="/api/expenses")


# GET /api/expenses → sab expenses (logged-in user ke)
@expense_bp.route("", methods=["GET"])
@token_required
def get_expenses():
    db = get_db()

    expenses = db.execute(
        "SELECT id, amount, category, date, note FROM expenses WHERE user_id = ? ORDER BY date DESC",
        (g.user_id,)
    ).fetchall()

    result = [dict(row) for row in expenses]

    return success_response("Expenses fetched successfully", result)


# POST /api/expenses → naya expense add
@expense_bp.route("", methods=["POST"])
@token_required
def add_expense():
    data = request.get_json()

    amount = data.get("amount")
    category = data.get("category")
    date = data.get("date")
    note = data.get("note", "")

    if not amount or not category or not date:
        return error_response("Amount, category, and date are required", 400)

    db = get_db()

    db.execute(
        "INSERT INTO expenses (user_id, amount, category, date, note) VALUES (?, ?, ?, ?, ?)",
        (g.user_id, amount, category, date, note)
    )
    db.commit()

    return success_response("Expense added successfully", None, 201)


# PUT /api/expenses/<id> → update
@expense_bp.route("/<int:id>", methods=["PUT"])
@token_required
def update_expense(id):
    data = request.get_json()

    amount = data.get("amount")
    category = data.get("category")
    date = data.get("date")
    note = data.get("note", "")

    db = get_db()

    existing = db.execute(
        "SELECT id FROM expenses WHERE id = ? AND user_id = ?",
        (id, g.user_id)
    ).fetchone()

    if not existing:
        return error_response("Expense not found", 404)

    db.execute(
        "UPDATE expenses SET amount=?, category=?, date=?, note=? WHERE id=?",
        (amount, category, date, note, id)
    )
    db.commit()

    return success_response("Expense updated successfully")


# DELETE /api/expenses/<id> → delete
@expense_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_expense(id):
    db = get_db()

    existing = db.execute(
        "SELECT id FROM expenses WHERE id = ? AND user_id = ?",
        (id, g.user_id)
    ).fetchone()

    if not existing:
        return error_response("Expense not found", 404)

    db.execute(
        "DELETE FROM expenses WHERE id = ?",
        (id,)
    )
    db.commit()

    return success_response("Expense deleted successfully")