import { useEffect, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import ConfirmModal from "../components/common/ConfirmModal";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import ToastMessage from "../components/common/ToastMessage";
import { EXPENSE_CATEGORIES } from "../constants/categories";
import { formatCurrency, formatDate } from "../utils/finance";

const initialForm = {
  title: "",
  category: "Bills",
  amount: "",
  frequency: "monthly",
  next_due_date: new Date().toISOString().split("T")[0],
};

export default function Recurring() {
  const [data, setData] = useState({ items: [], active_count: 0, monthly_committed: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const load = async () => {
    try {
      setLoading(true);
      const response = await API.get("/recurring");
      setData(response.data.data || { items: [], active_count: 0, monthly_committed: 0 });
    } catch {
      setToast({ message: "Could not load recurring transactions", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.title || !form.category || !form.amount || !form.next_due_date) {
      setToast({ message: "All fields are required", type: "error" });
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await API.put(`/recurring/${editingId}`, form);
        setToast({ message: "Recurring transaction updated", type: "success" });
      } else {
        await API.post("/recurring", form);
        setToast({ message: "Recurring transaction added", type: "success" });
      }
      resetForm();
      await load();
    } catch (error) {
      setToast({ message: error.response?.data?.message || "Failed to save", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      amount: item.amount,
      frequency: item.frequency,
      next_due_date: item.next_due_date,
    });
  };

  const markPaid = async (id) => {
    try {
      await API.post(`/recurring/${id}/mark-paid`);
      setToast({ message: "Marked as paid and logged as an expense", type: "success" });
      await load();
    } catch (error) {
      setToast({ message: error.response?.data?.message || "Failed to mark as paid", type: "error" });
    }
  };

  const toggleActive = async (id) => {
    try {
      await API.put(`/recurring/${id}/toggle`);
      await load();
    } catch {
      setToast({ message: "Failed to update status", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await API.delete(`/recurring/${confirmId}`);
      setToast({ message: "Recurring transaction deleted", type: "success" });
      setConfirmId(null);
      await load();
    } catch {
      setToast({ message: "Failed to delete", type: "error" });
    }
  };

  const items = data.items || [];

  if (loading) {
    return <AppShell title="Recurring" subtitle="Manage subscriptions and repeating bills"><Loader label="Loading recurring transactions" /></AppShell>;
  }

  return (
    <AppShell title="Recurring" subtitle="Manage subscriptions and repeating bills">
      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      <div className="stats-grid stats-grid-2">
        <div className="stat-card"><p>Active Subscriptions</p><h3>{data.active_count}</h3></div>
        <div className="stat-card"><p>Monthly Committed</p><h3 className="text-red">{formatCurrency(data.monthly_committed)}</h3></div>
      </div>

      <div className="panel">
        <h3>{editingId ? "Edit Recurring Transaction" : "Add Recurring Transaction"}</h3>
        <form className="form-grid" onSubmit={handleSave}>
          <input className="input" placeholder="Title (e.g. Netflix)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {EXPENSE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <input className="input" type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input className="input" type="date" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update" : "Add"}</button>
            {editingId ? <button className="button button-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>Upcoming & Active</h3>
        {items.length === 0 ? <EmptyState message="No recurring transactions set up yet" /> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th><th>Category</th><th>Amount</th><th>Frequency</th><th>Next Due</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td>
                  <td>{item.category}</td>
                  <td className="text-red">{formatCurrency(item.amount)}</td>
                  <td style={{ textTransform: "capitalize" }}>{item.frequency}</td>
                  <td>{formatDate(item.next_due_date)}</td>
                  <td>
                    {!item.is_active ? (
                      <span className="chip chip-danger">Paused</span>
                    ) : item.is_overdue ? (
                      <span className="chip chip-warning">Overdue</span>
                    ) : (
                      <span className="chip chip-success">Upcoming ({item.days_until_due}d)</span>
                    )}
                  </td>
                  <td>
                    <button className="link-btn" onClick={() => markPaid(item.id)}>Mark Paid</button>
                    <button className="link-btn" onClick={() => startEdit(item)}>Edit</button>
                    <button className="link-btn" onClick={() => toggleActive(item.id)}>{item.is_active ? "Pause" : "Resume"}</button>
                    <button className="link-btn danger" onClick={() => setConfirmId(item.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmId)}
        title="Delete recurring transaction"
        message="This will stop tracking this recurring bill. Continue?"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
