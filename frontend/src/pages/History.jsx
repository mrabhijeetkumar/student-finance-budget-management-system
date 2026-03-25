import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import SearchBar from "../components/common/SearchBar";
import ToastMessage from "../components/common/ToastMessage";
import { formatCurrency, formatDate } from "../utils/finance";

export default function History() {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [expenseRes, incomeRes] = await Promise.all([API.get("/expenses"), API.get("/incomes")]);
        setExpenses(expenseRes.data.data || []);
        setIncomes(incomeRes.data.data || []);
      } catch {
        setToast("Could not load history");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const mergedData = useMemo(() => {
    const normalizedExpenses = expenses.map((item) => ({
      ...item,
      type: "expense",
      title: item.category,
      amount: Number(item.amount),
    }));

    const normalizedIncomes = incomes.map((item) => ({
      ...item,
      type: "income",
      title: item.source,
      amount: Number(item.amount),
    }));

    return [...normalizedExpenses, ...normalizedIncomes]
      .filter((item) => {
        const q = search.toLowerCase();
        const matchType = type === "all" || item.type === type;
        const matchSearch = item.title.toLowerCase().includes(q) || (item.note || "").toLowerCase().includes(q);
        const matchStart = !startDate || item.date >= startDate;
        const matchEnd = !endDate || item.date <= endDate;
        return matchType && matchSearch && matchStart && matchEnd;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [expenses, incomes, type, search, startDate, endDate]);

  const historyStats = useMemo(() => {
    return {
      count: mergedData.length,
      incomeTotal: mergedData.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0),
      expenseTotal: mergedData.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0),
    };
  }, [mergedData]);

  return (
    <AppShell title="History" subtitle="Complete timeline of manual income and expense entries">
      <ToastMessage message={toast} type="error" onClose={() => setToast("")} />

      <div className="stats-grid stats-grid-3">
        <div className="stat-card"><p>Total Records</p><h3>{historyStats.count}</h3></div>
        <div className="stat-card"><p>Total Income</p><h3 className="text-green">{formatCurrency(historyStats.incomeTotal)}</h3></div>
        <div className="stat-card"><p>Total Expense</p><h3 className="text-red">{formatCurrency(historyStats.expenseTotal)}</h3></div>
      </div>

      <div className="panel">
        <div className="toolbar toolbar-3">
          <SearchBar value={search} onChange={setSearch} />
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="toolbar toolbar-3">
          <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {loading ? (
          <Loader label="Loading history" />
        ) : mergedData.length === 0 ? (
          <EmptyState message="No history found for selected filters" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Title</th>
                <th>Note</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {mergedData.map((item) => (
                <tr key={`${item.type}-${item.id}`}>
                  <td>{formatDate(item.date)}</td>
                  <td><span className={item.type === "income" ? "chip chip-success" : "chip chip-danger"}>{item.type}</span></td>
                  <td>{item.title}</td>
                  <td>{item.note || "-"}</td>
                  <td className={item.type === "income" ? "text-green" : "text-red"}>{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
