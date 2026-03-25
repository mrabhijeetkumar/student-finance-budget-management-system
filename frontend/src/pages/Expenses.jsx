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

const initialForm = {
  amount: "",
  category: "Food",
  date: new Date().toISOString().split("T")[0],
  note: "",
};

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

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await API.get("/expenses");
      setExpenses(response.data.data || []);
    } catch {
      setToast({ message: "Could not fetch expenses", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchCategory = categoryFilter === "All" || item.category === categoryFilter;
      const query = search.toLowerCase();
      const matchSearch =
        item.category.toLowerCase().includes(query) || (item.note || "").toLowerCase().includes(query);
      return matchCategory && matchSearch;
    });
  }, [expenses, categoryFilter, search]);

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

  return (
    <AppShell title="Expenses" subtitle="Track and manage your spending">
      <ToastMessage
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      {totalExpense > 50000 ? (
        <div className="warning-banner">Warning: your expense total crossed ₹50,000 budget limit.</div>
      ) : null}

      <div className="panel">
        <h3>{editingId ? "Edit Expense" : "Add Expense"}</h3>
        <form className="form-grid" onSubmit={handleSaveExpense}>
          <input
            className="input"
            type="number"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
          />

          <select
            className="input"
            value={form.category}
            onChange={(event) => setForm({ ...form, category: event.target.value })}
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
          />

          <input
            className="input"
            placeholder="Note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />

          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Expense" : "Add Expense"}
            </button>
            {editingId ? (
              <button className="button button-ghost" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="panel">
        <div className="toolbar">
          <SearchBar value={search} onChange={setSearch} />
          <FilterBar value={categoryFilter} onChange={setCategoryFilter} />
        </div>

        {loading ? (
          <Loader label="Loading expenses" />
        ) : filteredExpenses.length === 0 ? (
          <EmptyState message="No expenses match your filters" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.date}</td>
                  <td>{expense.category}</td>
                  <td>{expense.note || "-"}</td>
                  <td className="text-red">₹{expense.amount}</td>
                  <td>
                    <button className="link-btn" onClick={() => startEdit(expense)}>
                      Edit
                    </button>
                    <button className="link-btn danger" onClick={() => setConfirmId(expense.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmId)}
        title="Delete expense"
        message="This action cannot be undone. Are you sure?"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
