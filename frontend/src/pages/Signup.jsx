import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ToastMessage from "../components/common/ToastMessage";
import API, { setAuthToken, warmupBackend } from "../services/api";
import { setDashboardCache } from "../services/dashboardCache";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  useEffect(() => {
    warmupBackend();
  }, []);

  const handleSignup = async (event) => {
    event.preventDefault();

    if (password.trim().length < 6) {
      setToast({ message: "Password must be at least 6 characters", type: "error" });
      return;
    }

    try {
      setLoading(true);
      const response = await API.post("/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      const token = response.data?.data?.token;
      const user = response.data?.data?.user;

      if (token && user) {
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
        return;
      }

      navigate("/login", {
        replace: true,
        state: { message: "Account created successfully. Please login." },
      });
    } catch (error) {
      if (error.response?.status === 409) {
        navigate("/login", {
          replace: true,
          state: { message: "Email already registered. Please login." },
        });
        return;
      }

      const isTimeout = error.code === "ECONNABORTED";
      setToast({
        message: isTimeout
          ? "Server is taking longer than expected. Please try again."
          : error.response?.data?.message || "Signup failed. Please try again.",
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
        <h1>Create your account</h1>
        <p>Securely manage your manual income and expenses with smart analytics.</p>
        <ul>
          <li>✔ No automatic transactions</li>
          <li>✔ You control all data entries</li>
          <li>✔ Real-time budget and category insights</li>
        </ul>
      </div>

      <form className="auth-card" onSubmit={handleSignup}>
        <h2>Sign Up</h2>
        <p>Create an account to start tracking finances.</p>

        <input
          className="input"
          placeholder="Full Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />

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
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
