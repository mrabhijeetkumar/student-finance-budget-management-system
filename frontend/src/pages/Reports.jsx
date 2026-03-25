import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import ToastMessage from "../components/common/ToastMessage";
import EmptyState from "../components/common/EmptyState";
import { formatCurrency } from "../utils/finance";

export default function Reports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [analytics, setAnalytics] = useState(null);

  const loadAnalytics = async () => {
    try {
      const res = await API.get("/dashboard/analytics");
      setAnalytics(res.data.data);
    } catch {
      setToast({ message: "Failed to load analytics", type: "error" });
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const topCategories = useMemo(() => (analytics?.category_breakdown || []).slice(0, 5), [analytics]);

  const download = async (type) => {
    try {
      const url = type === "csv" ? "/reports/expenses/csv" : "/reports/expenses/monthly-pdf";
      const response = await API.get(url, {
        params: type === "pdf" ? { month } : undefined,
        responseType: "blob",
      });

      const mime = type === "csv" ? "text/csv" : "application/pdf";
      const ext = type === "csv" ? "csv" : "pdf";
      const fileName = type === "csv" ? `expenses-${month}.${ext}` : `expense-report-${month}.${ext}`;
      const blobUrl = URL.createObjectURL(new Blob([response.data], { type: mime }));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(blobUrl);
      setToast({ message: `Downloaded ${ext.toUpperCase()} report`, type: "success" });
    } catch {
      setToast({ message: "Report download failed", type: "error" });
    }
  };

  return (
    <AppShell title="Reports" subtitle="Export and compliance-ready financial reporting">
      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      <div className="panel">
        <h3>Generate Reports</h3>
        <div className="toolbar toolbar-3">
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="button" onClick={() => download("csv")}>Download CSV</button>
          <button className="button button-ghost" onClick={() => download("pdf")}>Download Monthly PDF</button>
        </div>
      </div>

      <div className="panel">
        <h3>Top Spending Categories</h3>
        {!topCategories.length ? (
          <EmptyState message="No analytics data available" />
        ) : (
          <ul className="rank-list">
            {topCategories.map((item, index) => (
              <li key={item.category}>
                <span>#{index + 1} {item.category}</span>
                <strong>{formatCurrency(item.amount)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
