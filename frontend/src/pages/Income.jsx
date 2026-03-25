import { useEffect, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import ToastMessage from "../components/common/ToastMessage";

const initialForm = {
  amount: "",
  source: "Salary",
  date: new Date().toISOString().split("T")[0],
  note: "",
};

export default function Income() {
  const [incomeList, setIncomeList] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const loadIncome = async () => {
    try {
      setLoading(true);
      const response = await API.get("/incomes");
      setIncomeList(response.data.data || []);
    } catch {
      setToast({ message: "Could not load income", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncome();
  }, []);

  const addIncome = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await API.post("/incomes", form);
      setForm(initialForm);
      setToast({ message: "Income added", type: "success" });
      await loadIncome();
    } catch {
      setToast({ message: "Failed to add income", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const deleteIncome = async (id) => {
    try {
      await API.delete(`/incomes/${id}`);
      setToast({ message: "Income deleted", type: "success" });
      await loadIncome();
    } catch {
      setToast({ message: "Failed to delete income", type: "error" });
    }
  };

  return (
    <AppShell title="Income" subtitle="Track earnings and incoming cash flow">
      <ToastMessage
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="panel">
        <h3>Add Income</h3>
        <form className="form-grid" onSubmit={addIncome}>
          <input
            className="input"
            type="number"
            placeholder="Amount"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Source"
            value={form.source}
            onChange={(event) => setForm({ ...form, source: event.target.value })}
            required
          />
          <input
            className="input"
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            required
          />
          <input
            className="input"
            placeholder="Note"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Add Income"}
          </button>
        </form>
      </div>

      <div className="panel">
        {loading ? (
          <Loader label="Loading income" />
        ) : incomeList.length === 0 ? (
          <EmptyState message="No income records yet" />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Note</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {incomeList.map((item) => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.source}</td>
                  <td>{item.note || "-"}</td>
                  <td className="text-green">₹{item.amount}</td>
                  <td>
                    <button className="link-btn danger" onClick={() => deleteIncome(item.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
