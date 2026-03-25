// Delete expense function
const deleteExpense = async (id) => {
    try {
        await API.delete(`/expenses/${id}`);
        fetchData(); // refresh list
    } catch (err) {
        alert("Delete failed ❌");
    }
};
import { useEffect, useState } from "react";
import API from "../services/api";

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");

    const fetchData = async () => {
        try {
            const res = await API.get("/dashboard/summary");
            setData(res.data.data);

            const exp = await API.get("/expenses");
            setExpenses(exp.data.data);
        } catch (err) {
            alert("Error loading data ❌");
        }
    };

    const addExpense = async () => {
        if (!amount || !category) {
            alert("Fill all fields");
            return;
        }

        try {
            await API.post("/expenses", {
                amount,
                category,
                date: new Date().toISOString().split("T")[0],
                note: "",
            });

            setAmount("");
            setCategory("");

            fetchData(); // refresh
        } catch (err) {
            alert("Failed to add expense ❌");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (!data) return <h2>Loading...</h2>;

    return (
        <div style={{ padding: "20px" }}>
            <h2>Dashboard</h2>

            <p><b>Total Income:</b> ₹{data.total_income}</p>
            <p><b>Total Expense:</b> ₹{data.total_expense}</p>
            <p><b>Balance:</b> ₹{data.balance}</p>

            <hr />

            <h3>Add Expense</h3>

            <input
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
            />

            <input
                placeholder="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
            />

            <button onClick={addExpense}>Add</button>

            <hr />

            <h3>Expenses</h3>

            {expenses.map((e) => (
                <div key={e.id} style={{ marginBottom: "10px" }}>
                    ₹{e.amount} - {e.category}
                    <button
                        style={{ marginLeft: "10px" }}
                        onClick={() => deleteExpense(e.id)}
                    >
                        Delete
                    </button>
                </div>
            ))}
        </div>
    );
}