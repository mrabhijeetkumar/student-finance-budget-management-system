from collections import defaultdict
from datetime import date
from io import BytesIO

from flask import Blueprint, Response, g, request, send_file

from middleware.auth_middleware import token_required
from services.analytics_service import expenses_to_csv
from services.report_service import build_monthly_pdf_report
from utils.db import get_db
from utils.response_helper import error_response

report_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


@report_bp.route("/expenses/csv", methods=["GET"])
@token_required
def download_expenses_csv():
    db = get_db()
    rows = db.execute(
        "SELECT date, category, note, amount FROM expenses WHERE user_id = ? ORDER BY date DESC",
        (g.user_id,),
    ).fetchall()

    csv_data = expenses_to_csv(rows)
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=expenses-export.csv"},
    )


@report_bp.route("/expenses/monthly-pdf", methods=["GET"])
@token_required
def monthly_pdf_report():
    month = request.args.get("month") or f"{date.today().year}-{date.today().month:02d}"
    db = get_db()

    user = db.execute("SELECT name FROM users WHERE id = ?", (g.user_id,)).fetchone()
    expenses = db.execute(
        "SELECT date, category, note, amount FROM expenses WHERE user_id = ? AND substr(date,1,7) = ? ORDER BY date ASC",
        (g.user_id, month),
    ).fetchall()

    if not expenses:
        return error_response("No expenses found for selected month", 404)

    total = sum(float(row["amount"]) for row in expenses)
    category_totals = defaultdict(float)
    for row in expenses:
        category_totals[row["category"]] += float(row["amount"])

    payload = [dict(row) for row in expenses]
    pdf_bytes = build_monthly_pdf_report(user["name"], month, payload, total, category_totals)

    return send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=True,
        download_name=f"expense-report-{month}.pdf",
    )
