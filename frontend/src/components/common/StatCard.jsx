export default function StatCard({ label, value, colorClass = "" }) {
  return (
    <div className="stat-card">
      <p>{label}</p>
      <h3 className={colorClass}>{value}</h3>
    </div>
  );
}
