
import os
from flask import Flask, jsonify
from flask_cors import CORS

from config import Config
from routes.auth_routes import auth_bp
from routes.budget_routes import budget_bp
from routes.dashboard_routes import dashboard_bp
from routes.expense_routes import expense_bp
from routes.goal_routes import goal_bp
from routes.income_routes import income_bp
from routes.profile_routes import profile_bp
from routes.recurring_routes import recurring_bp
from routes.report_routes import report_bp
from routes.ping_routes import ping_bp
from utils.db import close_db, init_db

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
    origins = [origin.strip() for origin in allowed_origins.split(",")] if allowed_origins != "*" else "*"
    CORS(app, resources={r"/api/*": {"origins": origins}, r"/ping": {"origins": origins}})
    os.makedirs(app.instance_path, exist_ok=True)

    with app.app_context():
        init_db()

    @app.route("/ping", methods=["GET"])
    def ping():
        return jsonify({"status": "ok"})

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"success": True, "message": "Backend is running"})

    @app.route("/api/init-db", methods=["GET"])
    def initialize_database():
        init_db()
        return jsonify({"success": True, "message": "Database initialized successfully"})

    @app.route("/")
    def root():
        return jsonify({"message": "API is running 🚀"})

    app.register_blueprint(auth_bp)
    app.register_blueprint(expense_bp)
    app.register_blueprint(income_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(budget_bp)
    app.register_blueprint(goal_bp)
    app.register_blueprint(recurring_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(ping_bp)

    app.teardown_appcontext(close_db)
    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
