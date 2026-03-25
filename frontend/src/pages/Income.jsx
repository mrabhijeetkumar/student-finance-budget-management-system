import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppShell from "../components/common/AppShell";
import ConfirmModal from "../components/common/ConfirmModal";
import EmptyState from "../components/common/EmptyState";
import Loader from "../components/common/Loader";
import SearchBar from "../components/common/SearchBar";
import ToastMessage from "../components/common/ToastMessage";
import { formatCurrency, formatDate } from "../utils/finance";

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
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);

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

  const deleteIncome = async () => {
    try {
      await API.delete(`/incomes/${confirmId}`);
      setToast({ message: "Income deleted", type: "success" });
      setConfirmId(null);
      await loadIncome();
    } catch {
      setToast({ message: "Failed to delete income", type: "error" });
    }
  };

  const filteredIncome = useMemo(() => {
    const query = search.toLowerCase();
    return incomeList.filter(
      (item) =>
        item.source.toLowerCase().includes(query) ||
        (item.note || "").toLowerCase().includes(query)
    );
  }, [incomeList, search]);

  const totalIncome = useMemo(
    () => filteredIncome.reduce((sum, item) => sum + Number(item.amount), 0),
    [filteredIncome]
  );

  return (
    <AppShell title="Income" subtitle="Track earnings and incoming cash flow">
      <ToastMessage
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="stats-grid stats-grid-2">
        <div className="stat-card">
          <p>Total Income</p>
          <h3 className="text-green">{formatCurrency(totalIncome)}</h3>
        </div>
        <div className="stat-card">
          <p>Records</p>
          <h3>{filteredIncome.length}</h3>
        </div>
      </div>

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
        <SearchBar value={search} onChange={setSearch} />
        {loading ? (
          <Loader label="Loading income" />
        ) : filteredIncome.length === 0 ? (
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
              {filteredIncome.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.source}</td>
                  <td>{item.note || "-"}</td>
                  <td className="text-green">{formatCurrency(item.amount)}</td>
                  <td>
                    <button className="link-btn danger" onClick={() => setConfirmId(item.id)}>
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
        title="Delete income"
        message="Do you want to remove this income record?"
        onCancel={() => setConfirmId(null)}
        onConfirm={deleteIncome}
      />
    </AppShell>
  );
}
