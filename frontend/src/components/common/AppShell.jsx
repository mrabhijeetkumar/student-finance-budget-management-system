import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppShell({ title, subtitle, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content-area">
        <Navbar title={title} subtitle={subtitle} />
        <section className="page-content">{children}</section>
      </main>
    </div>
  );
}
