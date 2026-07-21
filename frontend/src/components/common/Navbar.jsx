import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../../hooks/useTheme";
import { setAuthToken } from "../../services/api";

export default function Navbar({ title, subtitle }) {
  const { theme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const userName = localStorage.getItem("user_name") || "User";
  const userEmail = localStorage.getItem("user_email") || "user@example.com";

  const initials = useMemo(() => {
    return userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [userName]);

  useEffect(() => {
    const onClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    setAuthToken(null);
    navigate("/login", { replace: true });
  };

  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      <div className="topbar-actions">
        <button className="theme-btn" onClick={toggleTheme}>
          <span>{theme === "dark" ? "☀️" : "🌙"}</span>
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>

        <p className="topbar-date">{new Date().toLocaleDateString()}</p>

        <div className="profile-menu" ref={menuRef}>
          <button className="profile-trigger" onClick={() => setOpen((prev) => !prev)}>
            <span className="avatar">{initials || "U"}</span>
            <span className="profile-name">{userName}</span>
            <span className="profile-caret">▾</span>
          </button>

          {open ? (
            <div className="profile-dropdown">
              <div className="profile-head">
                <span className="avatar avatar-lg">{initials || "U"}</span>
                <div>
                  <strong>{userName}</strong>
                  <p>{userEmail}</p>
                </div>
              </div>
              <button className="menu-btn" onClick={() => { setOpen(false); navigate("/profile"); }}>
                👤 View Profile
              </button>
              <button className="menu-btn" onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
