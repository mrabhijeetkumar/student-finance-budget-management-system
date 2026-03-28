import { useEffect, useRef, useState } from "react";

import API from "../services/api";
import AppShell from "../components/common/AppShell";
import Loader from "../components/common/Loader";
import StatCard from "../components/common/StatCard";
import EmptyState from "../components/common/EmptyState";
import ToastMessage from "../components/common/ToastMessage";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import { formatCurrency } from "../utils/finance";

function ChartCanvas({ type, data, options }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new window.Chart(canvasRef.current, { type, data, options });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [type, data, options]);

  return <canvas ref={canvasRef} />;
}

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [insights, setInsights] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [budgetForm, setBudgetForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    category: "Food",
    amount: "",
  });

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const month = budgetForm.month;
      const overviewRes = await API.get("/dashboard/overview", { params: { month } });
      const overview = overviewRes.data.data || {};

      setSummary(overview.summary || null);
      setAnalytics(overview.analytics || null);
      setInsights(overview.insights || []);
      setPrediction(overview.prediction || null);
      setKpis(overview.kpis || null);
      setBudgetData(overview.budgets || null);
    } catch {
      setToast("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [budgetForm.month]);

  const handleSaveBudget = async (event) => {
    event.preventDefault();
    if (!budgetForm.amount) {
      setToast("Budget amount is required");
      return;
    }

    try {
      await API.post("/budgets", { ...budgetForm, amount: Number(budgetForm.amount) });
      setBudgetForm((prev) => ({ ...prev, amount: "" }));
      await loadDashboard();
    } catch (error) {
      setToast(error.response?.data?.message || "Failed to save budget");
    }
  };


  const handleDeleteBudget = async (id) => {
    try {
      await API.delete(`/budgets/${id}`);
      await loadDashboard();
    } catch {
      setToast("Unable to delete budget");
    }
  };

  const pieData = {
    labels: analytics?.category_breakdown?.map((item) => item.category) || [],
    datasets: [{ label: "Category Spend", data: analytics?.category_breakdown?.map((item) => item.amount) || [], backgroundColor: COLORS }],
  };

  const barData = {
    labels: analytics?.monthly_comparison?.map((item) => item.label) || [],
    datasets: [{ label: "Monthly Expense", data: analytics?.monthly_comparison?.map((item) => item.total) || [], backgroundColor: "rgba(59, 130, 246, 0.7)" }],
  };

  const lineData = {
    labels: analytics?.daily_trend?.map((item) => item.label) || [],
    datasets: [
      {
        label: "Daily Expense",
        data: analytics?.daily_trend?.map((item) => item.expense) || [],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        pointBackgroundColor: "#ef4444",
        pointRadius: 4,
        tension: 0.3,
      },
      {
        label: "Daily Income",
        data: analytics?.daily_trend?.map((item) => item.income) || [],
        borderColor: "#22c55e",
        backgroundColor: "rgba(34, 197, 94, 0.2)",
        pointBackgroundColor: "#22c55e",
        pointRadius: 4,
        tension: 0.3,
      },
    ],
  };

  if (loading) {
    return <AppShell title="Dashboard" subtitle="Financial Intelligence Overview"><Loader label="Preparing dashboard" /></AppShell>;
  }

  return (
    <AppShell title="Dashboard" subtitle="Intelligent financial management">
      <ToastMessage message={toast} type="error" onClose={() => setToast("")} />

      <div className="panel">
        <div className="panel-title-row">
          <div>
            <h3 style={{ marginBottom: 4 }}>Financial Snapshot</h3>
            <p className="muted">A quick glance at your current month performance.</p>
          </div>
          <span className="chip chip-success">Live Analytics</span>
        </div>
        <div className="stats-grid" style={{ marginTop: 12 }}>
          <StatCard label="Total Income" value={formatCurrency(summary?.total_income || 0)} colorClass="text-green" />
          <StatCard label="Total Expense" value={formatCurrency(summary?.total_expense || 0)} colorClass="text-red" />
          <StatCard label="Balance" value={formatCurrency(summary?.balance || 0)} colorClass="text-blue" />
        </div>
      </div>
      <div className="stats-grid">
        <StatCard label="Monthly Delta" value={formatCurrency(kpis?.delta_amount || 0)} colorClass={(kpis?.delta_amount || 0) > 0 ? "text-red" : "text-green"} />
        <StatCard label="Delta %" value={`${kpis?.delta_percent || 0}%`} colorClass={(kpis?.delta_percent || 0) > 0 ? "text-red" : "text-green"} />
        <StatCard label="Savings Rate" value={`${kpis?.savings_rate || 0}%`} colorClass="text-blue" />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Set Category Budget</h3>
          <form className="form-grid" onSubmit={handleSaveBudget}>
            <input className="input" type="month" value={budgetForm.month} onChange={(e) => setBudgetForm((p) => ({ ...p, month: e.target.value }))} />
            <select className="input" value={budgetForm.category} onChange={(e) => setBudgetForm((p) => ({ ...p, category: e.target.value }))}>
              {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <input className="input" type="number" min="0" placeholder="Budget amount" value={budgetForm.amount} onChange={(e) => setBudgetForm((p) => ({ ...p, amount: e.target.value }))} />
            <button className="button" type="submit">Save Budget</button>
          </form>
        </div>

        <div className="panel">
          <h3>AI Prediction</h3>
          <p className="muted">Next Month Predicted Expense</p>
          <h2 className="text-red">{formatCurrency(prediction?.predicted_expense || 0)}</h2>
          <p>{prediction?.suggestion}</p>
        </div>
      </div>

      <div className="panel">
        <h3>Budget Tracking ({budgetData?.month})</h3>
        {!budgetData?.items?.length ? <EmptyState message="No budgets set for this month" /> : (
          <div className="budget-grid">
            {budgetData.items.map((item) => (
              <div key={item.id} className="budget-item">
                <div className="panel-title-row">
                  <div className="budget-head"><strong>{item.category}</strong><button className="link-btn danger" onClick={() => handleDeleteBudget(item.id)}>Delete</button></div>
                  <span className={`chip ${item.status === "exceeded" ? "chip-danger" : item.status === "warning" ? "chip-warning" : "chip-success"}`}>
                    {item.status === "exceeded" ? "Exceeded" : item.status === "warning" ? "80% Warning" : "Safe"}
                  </span>
                </div>
                <p className="muted">Spent {formatCurrency(item.spent)} / {formatCurrency(item.amount)}</p>
                <div className="progress-wrap"><div className="progress-fill" style={{ width: `${Math.min(item.usage_percent, 100)}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid-2">
        <div className="panel"><h3>Category Distribution</h3>{pieData.labels.length ? <ChartCanvas type="pie" data={pieData} /> : <EmptyState message="No expense data" />}</div>
        <div className="panel"><h3>Monthly Expenses</h3>{barData.labels.length ? <ChartCanvas type="bar" data={barData} options={{ scales: { y: { beginAtZero: true } } }} /> : <EmptyState message="No monthly data" />}</div>
      </div>

      <div className="panel">
        <h3>Daily Income vs Expense Trend ({analytics?.trend_month || budgetForm.month})</h3>
        {lineData.labels.length ? (
          <ChartCanvas
            type="line"
            data={lineData}
            options={{
              responsive: true,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: { position: "top" },
                tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y || 0)}` } },
              },
              scales: { y: { beginAtZero: true } },
            }}
          />
        ) : (
          <EmptyState message="No daily income/expense data available for selected month" />
        )}
      </div>

      <div className="panel">
        <h3>Smart Insights</h3>
        {!insights.length ? (
          <EmptyState message="Insights will appear once enough activity is available" />
        ) : (
          <ul className="rank-list">{insights.map((insight) => <li key={insight}>{insight}</li>)}</ul>
        )}
      </div>
    </AppShell>
  );
}
