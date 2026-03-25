# income_routes.py
from flask import Blueprint, request, g
from utils.db import get_db
from utils.response_helper import success_response, error_response
from middleware.auth_middleware import token_required

income_bp = Blueprint("incomes", __name__, url_prefix="/api/incomes")


@income_bp.route("", methods=["GET"])
@token_required
def get_incomes():
    db = get_db()

    incomes = db.execute(
        "SELECT id, amount, source, date, note FROM incomes WHERE user_id = ? ORDER BY date DESC",
        (g.user_id,)
    ).fetchall()

    result = [dict(row) for row in incomes]

    return success_response("Incomes fetched successfully", result)


@income_bp.route("", methods=["POST"])
@token_required
def add_income():
    data = request.get_json()

    amount = data.get("amount")
    source = data.get("source")
    date = data.get("date")
    note = data.get("note", "")

    if not amount or not source or not date:
        return error_response("Amount, source, and date are required", 400)

    db = get_db()

    db.execute(
        "INSERT INTO incomes (user_id, amount, source, date, note) VALUES (?, ?, ?, ?, ?)",
        (g.user_id, amount, source, date, note)
    )
    db.commit()

    return success_response("Income added successfully", None, 201)


@income_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_income(id):
    db = get_db()

    existing = db.execute(
        "SELECT id FROM incomes WHERE id = ? AND user_id = ?",
        (id, g.user_id)
    ).fetchone()

    if not existing:
        return error_response("Income not found", 404)

    db.execute(
        "DELETE FROM incomes WHERE id = ?",
        (id,)
    )
    db.commit()

    return success_response("Income deleted successfully")