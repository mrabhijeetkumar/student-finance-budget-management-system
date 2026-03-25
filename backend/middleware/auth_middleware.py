# auth_middleware.py
from functools import wraps
from flask import request, g
from utils.jwt_helper import decode_token
from utils.response_helper import error_response

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return error_response("Authorization token is missing", 401)

        parts = auth_header.split()

        if len(parts) != 2 or parts[0] != "Bearer":
            return error_response("Invalid authorization format", 401)

        token = parts[1]
        payload = decode_token(token)

        if not payload:
            return error_response("Invalid or expired token", 401)

        g.user_id = payload["user_id"]
        g.user_email = payload["email"]

        return f(*args, **kwargs)

    return decorated