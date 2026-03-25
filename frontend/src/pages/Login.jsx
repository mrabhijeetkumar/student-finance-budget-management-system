import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { setAuthToken } from "../services/api";
import ToastMessage from "../components/common/ToastMessage";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const response = await API.post("/login", { email, password });
      const token = response.data.data.token;

      localStorage.setItem("token", token);
      setAuthToken(token);
      navigate("/dashboard", { replace: true });
    } catch {
      setToast({ message: "Invalid credentials", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <ToastMessage
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "success" })}
      />

      <div className="auth-hero">
        <h1>Finance Dashboard</h1>
        <p>Track expenses, monitor budget, and analyze trends with a modern dashboard.</p>
        <ul>
          <li>✔ Secure JWT authentication</li>
          <li>✔ Expense + Income management</li>
          <li>✔ Budget intelligence and analytics</li>
        </ul>
      </div>

      <form className="auth-card" onSubmit={handleLogin}>
        <h2>Welcome Back</h2>
        <p>Login to continue managing your finances.</p>

        <input
          className="input"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
