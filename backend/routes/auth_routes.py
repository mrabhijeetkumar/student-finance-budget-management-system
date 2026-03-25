from flask import Blueprint, request
from werkzeug.security import check_password_hash, generate_password_hash

from middleware.auth_middleware import token_required
from utils.db import get_db
from utils.jwt_helper import generate_token
from utils.response_helper import error_response, success_response
from utils.validators import is_strong_password, is_valid_email

auth_bp = Blueprint("auth", __name__, url_prefix="/api")


@auth_bp.route("/protected", methods=["GET"])
@token_required
def protected():
    return success_response("You have accessed a protected route!", None, 200)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not password:
        return error_response("Name, email, and password are required", 400)

    if not is_valid_email(email):
        return error_response("Invalid email format", 400)

    if not is_strong_password(password):
        return error_response("Password must be at least 6 characters long", 400)

    db = get_db()
    existing_user = db.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing_user:
        return error_response("Email already registered", 409)

    hashed_password = generate_password_hash(password)
    cursor = db.execute(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        (name, email, hashed_password),
    )
    db.commit()

    user = {"id": cursor.lastrowid, "name": name, "email": email}
    token = generate_token(user)

    return success_response("User registered successfully", {"token": token, "user": user}, 201)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "").strip()

    if not email or not password:
        return error_response("Email and password are required", 400)

    db = get_db()
    user = db.execute(
        "SELECT id, name, email, password FROM users WHERE email = ?",
        (email,),
    ).fetchone()

    if not user:
        return error_response("Invalid email or password", 401)

    if not check_password_hash(user["password"], password):
        return error_response("Invalid email or password", 401)

    token = generate_token(user)

    return success_response(
        "Login successful",
        {
            "token": token,
            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
            },
        },
        200,
    )
