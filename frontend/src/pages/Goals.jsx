import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import ConfirmModal from "../components/common/ConfirmModal";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import ToastMessage from "../components/common/ToastMessage";
import { formatCurrency, formatDate } from "../utils/finance";

const initialForm = { title: "", target_amount: "", deadline: "" };

export default function Goals() {
  const [goals, setGoals] = useState({ items: [], total_target: 0, total_saved: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [contributions, setContributions] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const loadGoals = async () => {
    try {
      setLoading(true);
      const response = await API.get("/goals");
      setGoals(response.data.data || { items: [], total_target: 0, total_saved: 0 });
    } catch {
      setToast({ message: "Could not load goals", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
  }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.title || !form.target_amount) {
      setToast({ message: "Title and target amount are required", type: "error" });
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await API.put(`/goals/${editingId}`, form);
        setToast({ message: "Goal updated", type: "success" });
      } else {
        await API.post("/goals", form);
        setToast({ message: "Goal created", type: "success" });
      }
      resetForm();
      await loadGoals();
    } catch (error) {
      setToast({ message: error.response?.data?.message || "Failed to save goal", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (goal) => {
    setEditingId(goal.id);
    setForm({ title: goal.title, target_amount: goal.target_amount, deadline: goal.deadline || "" });
  };

  const handleContribute = async (id, direction) => {
    const raw = Number(contributions[id]);
    if (!raw) {
      setToast({ message: "Enter an amount first", type: "error" });
      return;
    }

    try {
      await API.post(`/goals/${id}/contribute`, { amount: direction === "add" ? raw : -raw });
      setContributions((prev) => ({ ...prev, [id]: "" }));
      await loadGoals();
    } catch (error) {
      setToast({ message: error.response?.data?.message || "Failed to update progress", type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!confirmId) return;
    try {
      await API.delete(`/goals/${confirmId}`);
      setToast({ message: "Goal deleted", type: "success" });
      setConfirmId(null);
      await loadGoals();
    } catch {
      setToast({ message: "Failed to delete goal", type: "error" });
    }
  };

  const items = goals.items || [];
  const overallProgress = useMemo(() => {
    if (!goals.total_target) return 0;
    return Math.min(Math.round((goals.total_saved / goals.total_target) * 100), 100);
  }, [goals]);

  if (loading) {
    return <AppShell title="Goals" subtitle="Plan and track your savings targets"><Loader label="Loading goals" /></AppShell>;
  }

  return (
    <AppShell title="Goals" subtitle="Plan and track your savings targets">
      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      <div className="stats-grid stats-grid-3">
        <div className="stat-card"><p>Active Goals</p><h3>{items.length}</h3></div>
        <div className="stat-card"><p>Total Saved</p><h3 className="text-green">{formatCurrency(goals.total_saved)}</h3></div>
        <div className="stat-card"><p>Total Target</p><h3 className="text-blue">{formatCurrency(goals.total_target)}</h3></div>
      </div>

      <div className="panel">
        <div className="panel-title-row">
          <h3>Overall Progress</h3>
          <span className="chip chip-success">{overallProgress}%</span>
        </div>
        <div className="progress-wrap"><div className="progress-fill" style={{ width: `${overallProgress}%` }} /></div>
      </div>

      <div className="panel">
        <h3>{editingId ? "Edit Goal" : "Create a New Goal"}</h3>
        <form className="form-grid" onSubmit={handleSave}>
          <input className="input" placeholder="Goal title (e.g. New Laptop)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" type="number" min="0" step="0.01" placeholder="Target amount" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          <input className="input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Update Goal" : "Create Goal"}</button>
            {editingId ? <button className="button button-ghost" type="button" onClick={resetForm}>Cancel</button> : null}
          </div>
        </form>
      </div>

      <div className="panel">
        <h3>Your Goals</h3>
        {items.length === 0 ? <EmptyState message="No savings goals yet. Create your first one above." /> : (
          <div className="budget-grid">
            {items.map((goal) => (
              <div key={goal.id} className="budget-item">
                <div className="panel-title-row">
                  <div className="budget-head">
                    <strong>{goal.title}</strong>
                    {goal.is_completed ? <span className="chip chip-success">Achieved 🎉</span> : null}
                  </div>
                  <div>
                    <button className="link-btn" onClick={() => startEdit(goal)}>Edit</button>
                    <button className="link-btn danger" onClick={() => setConfirmId(goal.id)}>Delete</button>
                  </div>
                </div>
                <p className="muted">
                  {formatCurrency(goal.saved_amount)} of {formatCurrency(goal.target_amount)}
                  {goal.deadline ? ` · Target: ${formatDate(goal.deadline)}` : ""}
                </p>
                <div className="progress-wrap"><div className="progress-fill" style={{ width: `${goal.progress_percent}%` }} /></div>

                <div className="inline-form" style={{ marginTop: 10 }}>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={contributions[goal.id] || ""}
                    onChange={(e) => setContributions((prev) => ({ ...prev, [goal.id]: e.target.value }))}
                  />
                  <button className="button" type="button" onClick={() => handleContribute(goal.id, "add")}>Add Funds</button>
                  <button className="button button-ghost" type="button" onClick={() => handleContribute(goal.id, "remove")}>Withdraw</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={Boolean(confirmId)}
        title="Delete goal"
        message="This will permanently remove this savings goal. Continue?"
        onCancel={() => setConfirmId(null)}
        onConfirm={handleDelete}
      />
    </AppShell>
  );
}
