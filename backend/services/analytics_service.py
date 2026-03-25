from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
import csv


def month_key(value: str) -> str:
    dt = datetime.strptime(value, "%Y-%m-%d")
    return f"{dt.year}-{dt.month:02d}"


def month_label(key: str) -> str:
    dt = datetime.strptime(f"{key}-01", "%Y-%m-%d")
    return dt.strftime("%b %Y")


def get_dashboard_analytics(db, user_id: int) -> dict:
    expenses = db.execute(
        "SELECT amount, category, date FROM expenses WHERE user_id = ? ORDER BY date ASC",
        (user_id,),
    ).fetchall()

    total_expenses = float(sum(row["amount"] for row in expenses))

    category_totals = defaultdict(float)
    monthly_totals = defaultdict(float)

    for row in expenses:
        category_totals[row["category"]] += float(row["amount"])
        monthly_totals[month_key(row["date"])] += float(row["amount"])

    category_breakdown = [
        {"category": category, "amount": round(amount, 2)}
        for category, amount in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    ]

    monthly_comparison = [
        {"month": month, "label": month_label(month), "total": round(total, 2)}
        for month, total in sorted(monthly_totals.items(), key=lambda x: x[0])
    ]

    trend = []
    previous = 0.0
    for entry in monthly_comparison:
        total = entry["total"]
        change = ((total - previous) / previous * 100) if previous else 0.0
        trend.append({**entry, "change_percent": round(change, 2)})
        previous = total

    return {
        "total_expenses": round(total_expenses, 2),
        "category_breakdown": category_breakdown,
        "monthly_comparison": monthly_comparison,
        "trend": trend,
    }


def _month_total(expenses, month: str) -> float:
    return sum(float(row["amount"]) for row in expenses if month_key(row["date"]) == month)


def generate_smart_insights(db, user_id: int) -> list[str]:
    expenses = db.execute(
        "SELECT amount, category, date FROM expenses WHERE user_id = ? ORDER BY date ASC",
        (user_id,),
    ).fetchall()

    if not expenses:
        return ["No expenses found yet. Start adding records for personalized insights."]

    today = date.today()
    current_month = f"{today.year}-{today.month:02d}"
    previous_month_date = date(today.year - 1, 12, 1) if today.month == 1 else date(today.year, today.month - 1, 1)
    previous_month = f"{previous_month_date.year}-{previous_month_date.month:02d}"

    current_total = _month_total(expenses, current_month)
    previous_total = _month_total(expenses, previous_month)

    insights = []
    if previous_total > 0:
        diff = current_total - previous_total
        pct = abs(diff / previous_total * 100)
        direction = "more" if diff > 0 else "less"
        insights.append(f"You spent {pct:.1f}% {direction} than last month.")
    else:
        insights.append("No expenses found for previous month to compare trend.")

    category_totals = defaultdict(float)
    for row in expenses:
        category_totals[row["category"]] += float(row["amount"])

    highest_category, highest_amount = max(category_totals.items(), key=lambda item: item[1])
    insights.append(f"Highest spending category is {highest_category} at ₹{highest_amount:.2f}.")

    if current_total > 0 and highest_amount / current_total >= 0.35:
        insights.append(f"{highest_category} alone contributes over 35% of your monthly spending.")

    return insights


def predict_next_month_expense(db, user_id: int) -> dict:
    rows = db.execute(
        "SELECT amount, category, date FROM expenses WHERE user_id = ? ORDER BY date ASC",
        (user_id,),
    ).fetchall()

    monthly = defaultdict(float)
    category_monthly = defaultdict(float)
    for row in rows:
        mk = month_key(row["date"])
        monthly[mk] += float(row["amount"])
        category_monthly[(mk, row["category"])] += float(row["amount"])

    ordered = sorted(monthly.items(), key=lambda x: x[0])
    if len(ordered) == 0:
        return {"predicted_expense": 0, "suggestion": "Add expense data to enable prediction."}

    if len(ordered) == 1:
        pred = ordered[0][1]
    else:
        xs = list(range(len(ordered)))
        ys = [value for _, value in ordered]
        x_mean = sum(xs) / len(xs)
        y_mean = sum(ys) / len(ys)
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
        denominator = sum((x - x_mean) ** 2 for x in xs) or 1
        slope = numerator / denominator
        intercept = y_mean - slope * x_mean
        pred = slope * len(ordered) + intercept

    top_category = None
    if ordered:
        latest_month = ordered[-1][0]
        categories_latest = [(cat, amount) for (mth, cat), amount in category_monthly.items() if mth == latest_month]
        if categories_latest:
            top_category = max(categories_latest, key=lambda x: x[1])

    suggestion = "Maintain current spending behavior."
    if top_category and pred > ordered[-1][1]:
        reduction = min(15, max(5, (pred - ordered[-1][1]) / max(ordered[-1][1], 1) * 100))
        suggestion = f"Reduce {top_category[0]} spending by {reduction:.0f}% to control next month expenses."

    return {"predicted_expense": round(max(pred, 0), 2), "suggestion": suggestion}


def expenses_to_csv(rows) -> str:
    import io
    string_io = io.StringIO()
    writer = csv.writer(string_io)
    writer.writerow(["Date", "Category", "Note", "Amount"])
    for row in rows:
        writer.writerow([row["date"], row["category"], row["note"] or "", row["amount"]])
    return string_io.getvalue()
