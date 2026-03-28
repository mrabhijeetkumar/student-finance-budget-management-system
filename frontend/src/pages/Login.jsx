import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import ToastMessage from "../components/common/ToastMessage";
import API, { setAuthToken, warmupBackend } from "../services/api";
import { setDashboardCache } from "../services/dashboardCache";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    warmupBackend();

    if (location.state?.message) {
      setToast({ message: location.state.message, type: "success" });
    }
  }, [location.state]);

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      const response = await API.post("/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const token = response.data?.data?.token;
      const user = response.data?.data?.user;

      if (!token || !user) {
        throw new Error("Login payload missing");
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user_email", user.email);
      localStorage.setItem("user_name", user.name || "User");
      setAuthToken(token);
      const month = new Date().toISOString().slice(0, 7);

      API.get("/dashboard/overview", {
        params: { month },
        timeout: 10000,
      })
        .then((overviewRes) => {
          setDashboardCache(month, overviewRes.data?.data || null);
        })
        .catch(() => null);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      const isTimeout = error.code === "ECONNABORTED";
      setToast({
        message: isTimeout
          ? "Server is taking longer than expected. Please try again."
          : error.response?.data?.message || "Login failed. Please try again.",
        type: "error",
      });
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
          <li>✔ 100% manual transaction control</li>
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

        <p className="auth-forgot">
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>

        <p className="auth-switch">
          New user? <Link to="/signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
