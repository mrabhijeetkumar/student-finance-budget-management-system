import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { setAuthToken } from "../services/api";
import AppShell from "../components/common/AppShell";
import Loader from "../components/common/Loader";
import ToastMessage from "../components/common/ToastMessage";
import { formatCurrency, formatDate } from "../utils/finance";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", monthly_allowance: "", semester: "", student_type: "" });
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get("/profile");
      const data = response.data.data;
      setProfile(data);
      setForm({
        name: data.name || "",
        monthly_allowance: data.monthly_allowance || "",
        semester: data.semester || "",
        student_type: data.student_type || "",
      });
    } catch {
      setToast({ message: "Could not load profile", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const initials = useMemo(() => {
    return (form.name || "User")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [form.name]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setToast({ message: "Name is required", type: "error" });
      return;
    }

    try {
      setSaving(true);
      await API.put("/profile", form);
      localStorage.setItem("user_name", form.name.trim());
      setToast({ message: "Profile updated successfully", type: "success" });
      await loadProfile();
    } catch (error) {
      setToast({ message: error.response?.data?.message || "Failed to update profile", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (passwordForm.new_password.length < 6) {
      setToast({ message: "New password must be at least 6 characters", type: "error" });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setToast({ message: "New password and confirmation do not match", type: "error" });
      return;
    }

    try {
      setChangingPassword(true);
      await API.put("/profile/password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setToast({ message: "Password updated successfully", type: "success" });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      setToast({ message: error.response?.data?.message || "Failed to update password", type: "error" });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    setAuthToken(null);
    navigate("/login", { replace: true });
  };

  if (loading) {
    return <AppShell title="Profile" subtitle="Manage your account details"><Loader label="Loading profile" /></AppShell>;
  }

  return (
    <AppShell title="Profile" subtitle="Manage your account details">
      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "success" })} />

      <div className="panel profile-panel">
        <div className="profile-head">
          <span className="avatar avatar-lg">{initials || "U"}</span>
          <div>
            <strong>{profile?.name}</strong>
            <p className="muted">{profile?.email}</p>
          </div>
        </div>
        <p className="muted">Member since {profile?.member_since ? formatDate(profile.member_since) : "-"}</p>
        {form.monthly_allowance ? (
          <p>Monthly Allowance: <strong>{formatCurrency(form.monthly_allowance)}</strong></p>
        ) : null}
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Account Details</h3>
          <form className="form-grid" onSubmit={handleSaveProfile}>
            <input className="input" placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" type="number" min="0" placeholder="Monthly allowance" value={form.monthly_allowance} onChange={(e) => setForm({ ...form, monthly_allowance: e.target.value })} />
            <input className="input" placeholder="Semester (e.g. 5th)" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} />
            <select className="input" value={form.student_type} onChange={(e) => setForm({ ...form, student_type: e.target.value })}>
              <option value="">Select student type</option>
              <option value="Undergraduate">Undergraduate</option>
              <option value="Postgraduate">Postgraduate</option>
              <option value="PhD">PhD</option>
              <option value="Other">Other</option>
            </select>
            <div className="form-actions">
              <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </div>

        <div className="panel">
          <h3>Change Password</h3>
          <form className="form-grid" onSubmit={handleChangePassword}>
            <input
              className="input"
              type="password"
              placeholder="Current password"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
            />
            <input
              className="input"
              type="password"
              placeholder="New password"
              minLength={6}
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              minLength={6}
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
            />
            <div className="form-actions">
              <button className="button" type="submit" disabled={changingPassword}>
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="panel">
        <h3>Session</h3>
        <p className="muted">Sign out of FinTrack Pro on this device.</p>
        <button className="button button-danger" onClick={handleLogout}>Logout</button>
      </div>
    </AppShell>
  );
}
