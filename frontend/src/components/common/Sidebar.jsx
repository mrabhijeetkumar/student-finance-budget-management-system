import { NavLink, useNavigate } from "react-router-dom";
import { setAuthToken } from "../../services/api";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/expenses", label: "Expenses" },
  { to: "/income", label: "Income" },
  { to: "/history", label: "History" },
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
      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <button className="button button-ghost" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}
