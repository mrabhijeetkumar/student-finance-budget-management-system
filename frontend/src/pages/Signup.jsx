import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import ToastMessage from "../components/common/ToastMessage";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const handleSignup = async (event) => {
    event.preventDefault();
    try {
      setLoading(true);
      await API.post("/register", { name, email, password });
      navigate("/login", {
        replace: true,
        state: { message: "Account created successfully. Please login." },
      });
    } catch (error) {
      setToast({
        message: error.response?.data?.message || "Signup failed",
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
