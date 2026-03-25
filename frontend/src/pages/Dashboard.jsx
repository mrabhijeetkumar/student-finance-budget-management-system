import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import Loader from "../components/common/Loader";
import StatCard from "../components/common/StatCard";
import EmptyState from "../components/common/EmptyState";
import ToastMessage from "../components/common/ToastMessage";
import { formatCurrency, formatDate, getMonthKey } from "../utils/finance";

const COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

function PieLegend({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="legend-list">
      {data.map((item, index) => (
        <div key={item.name} className="legend-item">
          <span className="dot" style={{ background: COLORS[index % COLORS.length] }} />
          <span>{item.name}</span>
          <strong>{total ? `${Math.round((item.value / total) * 100)}%` : "0%"}</strong>
        </div>
      ))}
    </div>
  );
}

function MonthlyBarChart({ data }) {
  const max = Math.max(...data.map((item) => item.total), 1);

  return (
    <div className="bar-chart">
      {data.map((item) => (
        <div key={item.month} className="bar-column" title={formatCurrency(item.total)}>
          <div className="bar-track">
            <div className="bar-fill" style={{ height: `${(item.total / max) * 100}%` }} />
          </div>
          <span>{item.month}</span>
        </div>
      ))}
    </div>
  );
}

function BudgetProgress({ used }) {
  const [budget, setBudget] = useState(() => Number(localStorage.getItem("monthly_budget") || 50000));

  const usedPercent = Math.min(Math.round((used / Math.max(budget, 1)) * 100), 100);

  const saveBudget = (event) => {
    event.preventDefault();
    localStorage.setItem("monthly_budget", String(budget));
  };

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>Budget Tracker</h3>
        <span className={used > budget ? "chip chip-danger" : "chip chip-success"}>
          {used > budget ? "Over Budget" : "On Track"}
        </span>
      </div>
      <p className="muted">Spent {formatCurrency(used)} of {formatCurrency(budget)}</p>
      <div className="progress-wrap">
        <div className="progress-fill" style={{ width: `${usedPercent}%` }} />
      </div>
      <form className="inline-form" onSubmit={saveBudget}>
        <input
          className="input"
          type="number"
          min="1"
          value={budget}
          onChange={(event) => setBudget(Number(event.target.value))}
        />
        <button className="button" type="submit">Set Budget</button>
      </form>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [summaryRes, expenseRes, incomeRes] = await Promise.all([
        API.get("/dashboard/summary"),
        API.get("/expenses"),
        API.get("/incomes"),
      ]);

      setSummary(summaryRes.data.data);
      setExpenses(expenseRes.data.data || []);
      setIncomes(incomeRes.data.data || []);
    } catch {
      setToast("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const transactions = useMemo(() => {
    const normalizedExpenses = expenses.map((item) => ({ ...item, type: "expense", title: item.category }));
    const normalizedIncome = incomes.map((item) => ({ ...item, type: "income", title: item.source }));

    return [...normalizedExpenses, ...normalizedIncome]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [expenses, incomes]);

  const categoryChartData = useMemo(() => {
    const map = expenses.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Number(item.amount);
      return acc;
    }, {});
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const monthlyChartData = useMemo(() => {
    const map = expenses.reduce((acc, item) => {
      const key = getMonthKey(item.date);
      acc[key] = (acc[key] || 0) + Number(item.amount);
      return acc;
    }, {});
    return Object.entries(map).map(([month, total]) => ({ month, total }));
  }, [expenses]);

  const insight = useMemo(() => {
    const totalExpense = expenses.reduce((acc, item) => acc + Number(item.amount), 0);
    const topCategory = [...categoryChartData].sort((a, b) => b.value - a.value)[0]?.name || "-";
    const avgDaily = expenses.length ? totalExpense / Math.max(expenses.length, 1) : 0;
    return { totalExpense, topCategory, avgDaily };
  }, [expenses, categoryChartData]);

  if (loading) {
    return (
      <AppShell title="Dashboard" subtitle="Overview of your finances">
        <Loader label="Preparing your dashboard" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" subtitle="Portfolio-ready personal finance intelligence">
      <ToastMessage message={toast} type="error" onClose={() => setToast("")} />

      <div className="stats-grid">
        <StatCard label="Total Income" value={formatCurrency(summary?.total_income || 0)} colorClass="text-green" />
        <StatCard label="Total Expense" value={formatCurrency(summary?.total_expense || 0)} colorClass="text-red" />
        <StatCard label="Balance" value={formatCurrency(summary?.balance || 0)} colorClass="text-blue" />
      </div>

      <div className="stats-grid stats-grid-2">
        <div className="stat-card">
          <p>Top Expense Category</p>
          <h3>{insight.topCategory}</h3>
        </div>
        <div className="stat-card">
          <p>Average Transaction Spend</p>
          <h3>{formatCurrency(insight.avgDaily)}</h3>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Recent Transactions</h3>
          {transactions.length === 0 ? (
            <EmptyState message="No recent transactions yet" />
          ) : (
            <ul className="transaction-list">
              {transactions.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{formatDate(item.date)}</p>
                  </div>
                  <span className={item.type === "income" ? "text-green" : "text-red"}>
                    {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <BudgetProgress used={summary?.total_expense || 0} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Expense by Category</h3>
          {categoryChartData.length === 0 ? <EmptyState message="Add expenses to see chart data" /> : <PieLegend data={categoryChartData} />}
        </div>

        <div className="panel">
          <h3>Monthly Expenses</h3>
          {monthlyChartData.length === 0 ? (
            <EmptyState message="Monthly chart appears once expenses are added" />
          ) : (
            <MonthlyBarChart data={monthlyChartData} />
          )}
        </div>
      </div>
    </AppShell>
  );
}
