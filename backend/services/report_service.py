from datetime import datetime


def _escape_pdf_text(value: str) -> str:
    return value.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def build_monthly_pdf_report(user_name: str, month: str, expenses: list[dict], total: float, category_totals: dict) -> bytes:
    title = f"Monthly Expense Report - {datetime.strptime(month + '-01', '%Y-%m-%d').strftime('%B %Y')}"
    lines = [
        title,
        f"User: {user_name}",
        f"Total Expenses: INR {total:.2f}",
        "",
        "Category Summary:",
    ]

    for category, amount in sorted(category_totals.items(), key=lambda item: item[1], reverse=True):
        lines.append(f"- {category}: INR {amount:.2f}")

    lines.append("")
    lines.append("Transactions:")

    for item in expenses:
        note = (item.get("note") or "-")[:35]
        lines.append(f"{item['date']} | {item['category']} | INR {float(item['amount']):.2f} | {note}")

    text_lines = []
    y = 800
    for line in lines:
        safe = _escape_pdf_text(line)
        text_lines.append(f"BT /F1 11 Tf 40 {y} Td ({safe}) Tj ET")
        y -= 14
        if y < 40:
            break

    content = "\n".join(text_lines).encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj")
    objects.append(b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj")
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj")
    objects.append(f"5 0 obj << /Length {len(content)} >> stream\n".encode("latin-1") + content + b"\nendstream endobj")

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf += obj + b"\n"

    xref_start = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n".encode("latin-1")
    pdf += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        pdf += f"{off:010d} 00000 n \n".encode("latin-1")

    pdf += f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF".encode("latin-1")
    return pdf
