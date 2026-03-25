from flask_cors import CORS
from config import Config
from utils.db import close_db, init_db
from flask import Flask, jsonify, g
from middleware.auth_middleware import token_required
from routes.auth_routes import auth_bp
import os

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    CORS(app)

    os.makedirs(app.instance_path, exist_ok=True)

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "success": True,
            "message": "Backend is running"
        })

    @app.route("/api/init-db", methods=["GET"])
    def initialize_database():
        init_db()
        return jsonify({
            "success": True,
            "message": "Database initialized successfully"
        })

    app.register_blueprint(auth_bp)

    app.teardown_appcontext(close_db)
    return app


app = create_app()
print(app.url_map)  # DEBUG: Show all registered routes

if __name__ == "__main__":
    app.run(debug=True)