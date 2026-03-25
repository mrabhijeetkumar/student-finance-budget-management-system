export default function Navbar({ title, subtitle }) {
  return (
    <header className="topbar">
      <div>
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <p className="topbar-date">{new Date().toLocaleDateString()}</p>
    </header>
  );
}
