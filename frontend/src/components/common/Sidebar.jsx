import { NavLink, useNavigate } from "react-router-dom";
import { setAuthToken } from "../../services/api";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/expenses", label: "Expenses", icon: "💸" },
  { to: "/income", label: "Income", icon: "💰" },
  { to: "/history", label: "History", icon: "🧾" },
  { to: "/reports", label: "Reports", icon: "📄" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    setAuthToken(null);
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar">
      <h1 className="brand">FinTrack Pro</h1>
      <p className="sidebar-caption">Industrial Finance Suite</p>
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={({ isActive }) => `sidebar-link ${isActive ? "sidebar-link-active" : ""}`}>
            <span className="link-icon">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="button button-ghost" onClick={handleLogout}>Logout</button>
    </aside>
  );
}
