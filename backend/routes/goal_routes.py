# goal_routes.py
from flask import Blueprint, g, request

from middleware.auth_middleware import token_required
from utils.db import get_db
from utils.response_helper import error_response, success_response

goal_bp = Blueprint("goals", __name__, url_prefix="/api/goals")


def _serialize(row):
    target = float(row["target_amount"])
    saved = float(row["saved_amount"] or 0)
    progress = round((saved / target * 100), 2) if target else 0
    return {
        "id": row["id"],
        "title": row["title"],
        "target_amount": target,
        "saved_amount": round(saved, 2),
        "remaining_amount": round(max(target - saved, 0), 2),
        "progress_percent": min(progress, 100),
        "deadline": row["deadline"],
        "is_completed": saved >= target and target > 0,
    }


@goal_bp.route("", methods=["GET"])
@token_required
def get_goals():
    db = get_db()
    rows = db.execute(
        "SELECT id, title, target_amount, saved_amount, deadline FROM goals WHERE user_id = ? ORDER BY created_at DESC",
        (g.user_id,),
    ).fetchall()

    goals = [_serialize(row) for row in rows]
    total_target = sum(item["target_amount"] for item in goals)
    total_saved = sum(item["saved_amount"] for item in goals)

    return success_response("Goals fetched successfully", {
        "items": goals,
        "total_target": round(total_target, 2),
        "total_saved": round(total_saved, 2),
    })


@goal_bp.route("", methods=["POST"])
@token_required
def create_goal():
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    target_amount = data.get("target_amount")
    deadline = (data.get("deadline") or "").strip() or None
    saved_amount = data.get("saved_amount") or 0

    if not title or target_amount is None:
        return error_response("Title and target amount are required", 400)

    try:
        target_amount = float(target_amount)
        saved_amount = float(saved_amount)
    except (TypeError, ValueError):
        return error_response("Target amount must be a number", 400)

    if target_amount <= 0:
        return error_response("Target amount must be greater than zero", 400)

    db = get_db()
    db.execute(
        "INSERT INTO goals (user_id, title, target_amount, saved_amount, deadline) VALUES (?, ?, ?, ?, ?)",
        (g.user_id, title, target_amount, saved_amount, deadline),
    )
    db.commit()

    return success_response("Goal created successfully", None, 201)


@goal_bp.route("/<int:id>", methods=["PUT"])
@token_required
def update_goal(id):
    data = request.get_json(silent=True) or {}

    title = (data.get("title") or "").strip()
    target_amount = data.get("target_amount")
    deadline = (data.get("deadline") or "").strip() or None

    if not title or target_amount is None:
        return error_response("Title and target amount are required", 400)

    try:
        target_amount = float(target_amount)
    except (TypeError, ValueError):
        return error_response("Target amount must be a number", 400)

    db = get_db()
    existing = db.execute("SELECT id FROM goals WHERE id = ? AND user_id = ?", (id, g.user_id)).fetchone()
    if not existing:
        return error_response("Goal not found", 404)

    db.execute(
        "UPDATE goals SET title = ?, target_amount = ?, deadline = ? WHERE id = ? AND user_id = ?",
        (title, target_amount, deadline, id, g.user_id),
    )
    db.commit()

    return success_response("Goal updated successfully")


@goal_bp.route("/<int:id>/contribute", methods=["POST"])
@token_required
def contribute_goal(id):
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")

    try:
        amount = float(amount)
    except (TypeError, ValueError):
        return error_response("A valid contribution amount is required", 400)

    if amount == 0:
        return error_response("Contribution amount cannot be zero", 400)

    db = get_db()
    goal = db.execute(
        "SELECT id, saved_amount FROM goals WHERE id = ? AND user_id = ?", (id, g.user_id)
    ).fetchone()

    if not goal:
        return error_response("Goal not found", 404)

    new_saved = max(float(goal["saved_amount"] or 0) + amount, 0)
    db.execute("UPDATE goals SET saved_amount = ? WHERE id = ? AND user_id = ?", (new_saved, id, g.user_id))
    db.commit()

    return success_response("Goal progress updated", {"saved_amount": round(new_saved, 2)})


@goal_bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_goal(id):
    db = get_db()
    deleted = db.execute("DELETE FROM goals WHERE id = ? AND user_id = ?", (id, g.user_id)).rowcount
    db.commit()

    if deleted == 0:
        return error_response("Goal not found", 404)

    return success_response("Goal deleted successfully")
