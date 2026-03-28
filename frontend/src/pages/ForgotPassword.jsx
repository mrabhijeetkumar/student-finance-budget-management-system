import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ToastMessage from "../components/common/ToastMessage";
import API from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (newPassword.trim().length < 6) {
      setToast({ message: "Password must be at least 6 characters", type: "error" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setToast({ message: "Passwords do not match", type: "error" });
      return;
    }

    try {
      setLoading(true);
      await API.post("/forgot-password", {
        email: email.trim().toLowerCase(),
        newPassword,
      });

      navigate("/login", {
        replace: true,
        state: { message: "Password reset successful. Please login." },
      });
    } catch (error) {
      setToast({
        message: error.response?.data?.message || "Failed to reset password. Please try again.",
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
        <h1>Reset Password</h1>
        <p>Recover your account quickly and continue tracking your finances securely.</p>
        <ul>
          <li>✔ Fast password recovery flow</li>
          <li>✔ Clear validations and instant feedback</li>
          <li>✔ Seamless return to login</li>
        </ul>
      </div>

      <form className="auth-card" onSubmit={handleResetPassword}>
        <h2>Forgot Password</h2>
        <p>Enter your registered email and set a new password.</p>

        <input
          className="input"
          type="email"
          placeholder="Registered Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          className="input"
          type="password"
          placeholder="New Password"
          minLength={6}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          required
        />

        <input
          className="input"
          type="password"
          placeholder="Confirm New Password"
          minLength={6}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        <button className="button" type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        <p className="auth-switch">
          Remembered password? <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  );
}
