# date_helper.py
from datetime import date, datetime, timedelta


def parse_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _add_months(d: date, months: int) -> date:
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, _days_in_month(year, month))
    return date(year, month, day)


def _days_in_month(year: int, month: int) -> int:
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    return (next_month - date(year, month, 1)).days


def advance_date(value: str, frequency: str) -> str:
    """Return the next due date (as ISO string) after advancing `value` by one `frequency` period."""
    d = parse_date(value)
    frequency = (frequency or "monthly").lower()

    if frequency == "daily":
        d = d + timedelta(days=1)
    elif frequency == "weekly":
        d = d + timedelta(weeks=1)
    elif frequency == "yearly":
        try:
            d = d.replace(year=d.year + 1)
        except ValueError:
            d = d.replace(year=d.year + 1, day=28)
    else:
        d = _add_months(d, 1)

    return d.isoformat()


def is_overdue(value: str, today: date | None = None) -> bool:
    today = today or date.today()
    return parse_date(value) < today


def days_until(value: str, today: date | None = None) -> int:
    today = today or date.today()
    return (parse_date(value) - today).days
