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
  const ticks = [1, 0.75, 0.5, 0.25].map((ratio) => Math.round(max * ratio));

  return (
    <div className="month-chart-wrap">
      <div className="y-axis">
        {ticks.map((tick) => (
          <span key={tick}>{formatCurrency(tick)}</span>
        ))}
      </div>

      <div className="bar-chart-grid">
        {ticks.map((tick) => (
          <div key={tick} className="grid-line" />
        ))}

        <div className="bar-chart">
          {data.map((item) => (
            <div key={item.month} className="bar-column" title={`${item.month}: ${formatCurrency(item.total)}`}>
              <div className="bar-track">
                <div className="bar-fill" style={{ height: `${(item.total / max) * 100}%` }}>
                  <span className="bar-value">{formatCurrency(item.total)}</span>
                </div>
              </div>
              <span className="bar-label">{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavingsTrendChart({ data }) {
  if (!data.length) {
    return <EmptyState message="Add income and expenses to unlock trend chart" />;
  }

  const maxValue = Math.max(...data.map((item) => Math.max(item.income, item.expense, item.savings)), 1);
  const minValue = Math.min(...data.map((item) => Math.min(item.income, item.expense, item.savings, 0)), 0);
  const range = Math.max(maxValue - minValue, 1);
  const width = 640;
  const height = 260;
  const padding = 28;

  const toX = (index) => padding + ((width - padding * 2) * index) / Math.max(data.length - 1, 1);
  const toY = (value) => height - padding - ((value - minValue) / range) * (height - padding * 2);

  const buildPath = (selector) =>
    data
      .map((item, index) => `${index === 0 ? "M" : "L"}${toX(index)} ${toY(item[selector])}`)
      .join(" ");

  const incomePath = buildPath("income");
  const expensePath = buildPath("expense");
  const savingsPath = buildPath("savings");

  return (
    <div className="trend-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="img" aria-label="Income, expense and savings trend">
        {[0, 0.25, 0.5, 0.75, 1].map((mark) => {
          const y = padding + (height - padding * 2) * mark;
          return <line key={mark} x1={padding} y1={y} x2={width - padding} y2={y} className="trend-grid-line" />;
        })}
        <path d={incomePath} className="trend-line trend-line-income" />
        <path d={expensePath} className="trend-line trend-line-expense" />
        <path d={savingsPath} className="trend-line trend-line-savings" />
      </svg>

      <div className="trend-legend">
        <span><i className="trend-chip trend-chip-income" /> Income</span>
        <span><i className="trend-chip trend-chip-expense" /> Expense</span>
        <span><i className="trend-chip trend-chip-savings" /> Savings</span>
      </div>

      <div className="trend-x-axis">
        {data.map((item) => (
          <span key={item.month}>{item.month}</span>
        ))}
      </div>
    </div>
  );
}

function BudgetProgress({ spent, balance }) {
  const userEmail = localStorage.getItem("user_email") || "guest";
  const budgetStorageKey = `monthly_budget_${userEmail}`;
  const [budget, setBudget] = useState(() => Number(localStorage.getItem(budgetStorageKey) || 50000));
  const [savedMessage, setSavedMessage] = useState("");

  const usedPercent = Math.min(Math.round((spent / Math.max(budget, 1)) * 100), 100);
  const remaining = Math.max(budget - spent, 0);

  const saveBudget = (event) => {
    event.preventDefault();
    localStorage.setItem(budgetStorageKey, String(budget));
    setSavedMessage("Manual budget saved");
    setTimeout(() => setSavedMessage(""), 1500);
  };

  return (
    <div className="panel">
      <div className="panel-title-row">
        <h3>Manual Budget Tracker</h3>
        <span className={spent > budget ? "chip chip-danger" : "chip chip-success"}>
          {spent > budget ? "Over Budget" : "On Track"}
        </span>
      </div>
      <p className="muted">Spent: {formatCurrency(spent)}</p>
      <p className="muted">Remaining: {formatCurrency(remaining)}</p>
      <p className="muted">Current Balance: {formatCurrency(balance)}</p>
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
      {savedMessage ? <p className="muted">{savedMessage}</p> : null}
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
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!acc[key]) {
        acc[key] = { month: getMonthKey(item.date), total: 0, ts: new Date(date.getFullYear(), date.getMonth(), 1).getTime() };
      }
      acc[key].total += Number(item.amount);
      return acc;
    }, {});

    return Object.values(map)
      .sort((a, b) => a.ts - b.ts)
      .map(({ month, total }) => ({ month, total }));
  }, [expenses]);

  const savingsTrendData = useMemo(() => {
    const monthlyMap = {};

    for (const item of incomes) {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { ts: new Date(date.getFullYear(), date.getMonth(), 1).getTime(), month: getMonthKey(item.date), income: 0, expense: 0 };
      }
      monthlyMap[key].income += Number(item.amount);
    }

    for (const item of expenses) {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyMap[key]) {
        monthlyMap[key] = { ts: new Date(date.getFullYear(), date.getMonth(), 1).getTime(), month: getMonthKey(item.date), income: 0, expense: 0 };
      }
      monthlyMap[key].expense += Number(item.amount);
    }

    return Object.values(monthlyMap)
      .sort((a, b) => a.ts - b.ts)
      .map((item) => ({ ...item, savings: item.income - item.expense }));
  }, [incomes, expenses]);

  const smartInsights = useMemo(() => {
    const totalExpense = expenses.reduce((acc, item) => acc + Number(item.amount), 0);
    const topCategory = [...categoryChartData].sort((a, b) => b.value - a.value)[0]?.name || "-";
    const highestExpense = [...expenses].sort((a, b) => Number(b.amount) - Number(a.amount))[0]?.amount || 0;
    const averageSpending = expenses.length ? totalExpense / expenses.length : 0;

    const now = new Date();
    const todayKey = now.toISOString().split("T")[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const month = now.getMonth();
    const year = now.getFullYear();

    const todaySpending = expenses
      .filter((item) => item.date === todayKey)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const weekSpending = expenses
      .filter((item) => new Date(item.date) >= weekStart)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    const monthSpending = expenses
      .filter((item) => {
        const d = new Date(item.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })
      .reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      topCategory,
      highestExpense,
      averageSpending,
      totalTransactions: expenses.length + incomes.length,
      todaySpending,
      weekSpending,
      monthSpending,
    };
  }, [expenses, incomes, categoryChartData]);

  if (loading) {
    return (
      <AppShell title="Dashboard" subtitle="Overview of your finances">
        <Loader label="Preparing your dashboard" />
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" subtitle="Smart manual finance tracker (no automation)">
      <ToastMessage message={toast} type="error" onClose={() => setToast("")} />

      <div className="stats-grid">
        <StatCard label="Total Income" value={formatCurrency(summary?.total_income || 0)} colorClass="text-green" />
        <StatCard label="Total Expense" value={formatCurrency(summary?.total_expense || 0)} colorClass="text-red" />
        <StatCard label="Balance" value={formatCurrency(summary?.balance || 0)} colorClass="text-blue" />
      </div>

      <div className="stats-grid">
        <StatCard label="Top Category" value={smartInsights.topCategory} />
        <StatCard label="Highest Expense" value={formatCurrency(smartInsights.highestExpense)} colorClass="text-red" />
        <StatCard label="Average Spending" value={formatCurrency(smartInsights.averageSpending)} />
      </div>

      <div className="stats-grid stats-grid-2">
        <StatCard label="Today's Spending" value={formatCurrency(smartInsights.todaySpending)} colorClass="text-red" />
        <StatCard label="This Week Spending" value={formatCurrency(smartInsights.weekSpending)} colorClass="text-red" />
      </div>

      <div className="stats-grid stats-grid-2">
        <StatCard label="This Month Spending" value={formatCurrency(smartInsights.monthSpending)} colorClass="text-red" />
        <StatCard label="Total Transactions" value={smartInsights.totalTransactions} />
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

        <BudgetProgress spent={summary?.total_expense || 0} balance={summary?.balance || 0} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Category Analysis (with %)</h3>
          {categoryChartData.length === 0 ? <EmptyState message="Add expenses to see chart data" /> : <PieLegend data={categoryChartData} />}
        </div>

        <div className="panel">
          <h3>Monthly Expense Analysis</h3>
          {monthlyChartData.length === 0 ? (
            <EmptyState message="Monthly chart appears once expenses are added" />
          ) : (
            <MonthlyBarChart data={monthlyChartData} />
          )}
        </div>
      </div>

      <div className="panel">
        <h3>Income vs Expense vs Savings Trend</h3>
        <SavingsTrendChart data={savingsTrendData} />
      </div>
    </AppShell>
  );
}
