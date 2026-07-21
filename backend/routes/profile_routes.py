# profile_routes.py
from flask import Blueprint, g, request
from werkzeug.security import check_password_hash, generate_password_hash

from middleware.auth_middleware import token_required
from utils.db import get_db
from utils.response_helper import error_response, success_response
from utils.validators import is_strong_password

profile_bp = Blueprint("profile", __name__, url_prefix="/api/profile")


@profile_bp.route("", methods=["GET"])
@token_required
def get_profile():
    db = get_db()

    user = db.execute(
        "SELECT id, name, email, created_at FROM users WHERE id = ?", (g.user_id,)
    ).fetchone()

    if not user:
        return error_response("User not found", 404)

    profile = db.execute(
        "SELECT monthly_allowance, semester, student_type FROM profiles WHERE user_id = ?",
        (g.user_id,),
    ).fetchone()

    return success_response("Profile fetched successfully", {
        "name": user["name"],
        "email": user["email"],
        "member_since": user["created_at"],
        "monthly_allowance": float(profile["monthly_allowance"]) if profile else 0,
        "semester": profile["semester"] if profile else "",
        "student_type": profile["student_type"] if profile else "",
    })


@profile_bp.route("", methods=["PUT"])
@token_required
def update_profile():
    data = request.get_json(silent=True) or {}

    name = (data.get("name") or "").strip()
    monthly_allowance = data.get("monthly_allowance") or 0
    semester = (data.get("semester") or "").strip()
    student_type = (data.get("student_type") or "").strip()

    if not name:
        return error_response("Name is required", 400)

    try:
        monthly_allowance = float(monthly_allowance)
    except (TypeError, ValueError):
        return error_response("Monthly allowance must be a number", 400)

    db = get_db()
    db.execute("UPDATE users SET name = ? WHERE id = ?", (name, g.user_id))

    existing = db.execute("SELECT id FROM profiles WHERE user_id = ?", (g.user_id,)).fetchone()
    if existing:
        db.execute(
            "UPDATE profiles SET monthly_allowance = ?, semester = ?, student_type = ? WHERE user_id = ?",
            (monthly_allowance, semester, student_type, g.user_id),
        )
    else:
        db.execute(
            "INSERT INTO profiles (user_id, monthly_allowance, semester, student_type) VALUES (?, ?, ?, ?)",
            (g.user_id, monthly_allowance, semester, student_type),
        )

    db.commit()
    return success_response("Profile updated successfully")


@profile_bp.route("/password", methods=["PUT"])
@token_required
def change_password():
    data = request.get_json(silent=True) or {}

    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not current_password or not new_password:
        return error_response("Current and new password are required", 400)

    if not is_strong_password(new_password):
        return error_response("New password must be at least 6 characters long", 400)

    db = get_db()
    user = db.execute("SELECT password FROM users WHERE id = ?", (g.user_id,)).fetchone()

    if not user or not check_password_hash(user["password"], current_password):
        return error_response("Current password is incorrect", 401)

    hashed = generate_password_hash(new_password)
    db.execute("UPDATE users SET password = ? WHERE id = ?", (hashed, g.user_id))
    db.commit()

    return success_response("Password updated successfully")
