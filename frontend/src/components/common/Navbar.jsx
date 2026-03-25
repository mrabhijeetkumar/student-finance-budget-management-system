import useTheme from "../../hooks/useTheme";

export default function Navbar({ title, subtitle }) {
  const { theme, toggleTheme } = useTheme();
  const userName = localStorage.getItem("user_name") || "User";

  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      <div className="topbar-actions">
        <div className="user-chip">
          <span>{userName}</span>
        </div>
        <button className="button button-ghost" onClick={toggleTheme}>
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <p className="topbar-date">{new Date().toLocaleDateString()}</p>
      </div>
    </header>
  );
}
