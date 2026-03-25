import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import ConfirmModal from "../components/common/ConfirmModal";
import EmptyState from "../components/common/EmptyState";
import FilterBar from "../components/common/FilterBar";
import Loader from "../components/common/Loader";
import SearchBar from "../components/common/SearchBar";
import ToastMessage from "../components/common/ToastMessage";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import { formatCurrency, formatDate } from "../utils/finance";

const initialForm = {
  amount: "",
  category: "Food",
  date: new Date().toISOString().split("T")[0],
  note: "",
};

const PAGE_SIZE = 8;

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await API.get("/expenses", {
        params: {
          q: search || undefined,
          category: categoryFilter !== "All" ? categoryFilter : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });
      setExpenses(response.data.data || []);
    } catch {
      setToast({ message: "Could not fetch expenses", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [search, categoryFilter, startDate, endDate]);

  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const filteredExpenses = useMemo(() => {
    const sorters = {
      date_desc: (a, b) => new Date(b.date) - new Date(a.date),
      date_asc: (a, b) => new Date(a.date) - new Date(b.date),
      amount_desc: (a, b) => Number(b.amount) - Number(a.amount),
      amount_asc: (a, b) => Number(a.amount) - Number(b.amount),
    };

    return [...expenses].sort(sorters[sortBy]);
  }, [expenses, sortBy]);

  const totalPages = Math.max(Math.ceil(filteredExpenses.length / PAGE_SIZE), 1);
  const paginatedExpenses = filteredExpenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, startDate, endDate, sortBy]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSaveExpense = async (event) => {
    event.preventDefault();

    if (!form.amount || !form.category || !form.date) {
      setToast({ message: "Amount, category, and date are required", type: "error" });
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await API.put(`/expenses/${editingId}`, form);
        setToast({ message: "Expense updated", type: "success" });
      } else {
        await API.post("/expenses", form);
        setToast({ message: "Expense added", type: "success" });
      }
      resetForm();
      await loadExpenses();
    } catch {
      setToast({ message: "Failed to save expense", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      note: expense.note || "",
    });
  };

  const handleDelete = async () => {
    if (!confirmId) return;

    try {
      await API.delete(`/expenses/${confirmId}`);
      setToast({ message: "Expense deleted", type: "success" });
      setConfirmId(null);
      await loadExpenses();
    } catch {
      setToast({ message: "Failed to delete expense", type: "error" });
    }
  };

  const exportCsv = async () => {
    try {
      const response = await API.get("/reports/expenses/csv", { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([response.data], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "expenses-export.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setToast({ message: "CSV export failed", type: "error" });
    }
  };

  const exportPdf = async () => {
    const month = (startDate || new Date().toISOString().slice(0, 7)).slice(0, 7);
    try {
      const response = await API.get("/reports/expenses/monthly-pdf", {
        params: { month },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `expense-report-${month}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setToast({ message: error.response?.data?.message || "PDF export failed", type: "error" });
    }
  };

  const highestExpense = useMemo(() => filteredExpenses.reduce((max, item) => Math.max(max, Number(item.amount)), 0), [filteredExpenses]);

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("All");
    setStartDate("");
    setEndDate("");
    setSortBy("date_desc");
  };


  return (
    <AppShell title="Expenses" subtitle="Search, filter, export, and manage spending">
      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      <div className="stats-grid stats-grid-3">
        <StatMini title="Total Spend" value={formatCurrency(totalExpense)} />
        <StatMini title="Filtered Records" value={String(filteredExpenses.length)} />
        <StatMini title="Highest Expense" value={formatCurrency(highestExpense)} />
      </div>

      <div className="panel">
        <h3>{editingId ? "Edit Expense" : "Add Expense"}</h3>
        <form className="form-grid" onSubmit={handleSaveExpense}>
          <input className="input" type="number" step="0.01" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
          <select className="input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <input className="input" placeholder="Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Expense" : "Add Expense"}</button>
            {editingId ? <button className="button button-ghost" type="button" onClick={resetForm}>Cancel Edit</button> : null}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="toolbar toolbar-3">
          <SearchBar value={search} onChange={setSearch} />
          <FilterBar value={categoryFilter} onChange={setCategoryFilter} />
          <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="date_desc">Latest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Amount High to Low</option>
            <option value="amount_asc">Amount Low to High</option>
          </select>
        </div>

        <div className="toolbar toolbar-5">
          <input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          <input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          <button className="button button-ghost" onClick={exportCsv}>Export CSV</button>
          <button className="button button-ghost" onClick={exportPdf}>Export PDF</button>
          <button className="button button-ghost" onClick={resetFilters}>Reset Filters</button>
        </div>

        {loading ? <Loader label="Loading expenses" /> : filteredExpenses.length === 0 ? <EmptyState message="No expenses match your filters" /> : (
          <>
            <table className="data-table">
              <thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Amount</th><th>Actions</th></tr></thead>
              <tbody>
                {paginatedExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>{formatDate(expense.date)}</td>
                    <td>{expense.category}</td>
                    <td>{expense.note || "-"}</td>
                    <td className="text-red">{formatCurrency(expense.amount)}</td>
                    <td>
                      <button className="link-btn" onClick={() => startEdit(expense)}>Edit</button>
                      <button className="link-btn danger" onClick={() => setConfirmId(expense.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button className="button button-ghost" disabled={page === 1} onClick={() => setPage((prev) => prev - 1)}>Prev</button>
              <span>Page {page} / {totalPages}</span>
              <button className="button button-ghost" disabled={page === totalPages} onClick={() => setPage((prev) => prev + 1)}>Next</button>
            </div>
          </>
        )}
      </div>

      <ConfirmModal open={Boolean(confirmId)} title="Delete expense" message="This action cannot be undone. Are you sure?" onCancel={() => setConfirmId(null)} onConfirm={handleDelete} />
    </AppShell>
  );
}

function StatMini({ title, value }) {
  return (
    <div className="stat-card">
      <p>{title}</p>
      <h3>{value}</h3>
    </div>
  );
}
