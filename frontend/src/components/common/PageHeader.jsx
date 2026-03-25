export default function PageHeader({ title, description }) {
  return (
    <div className="page-header">
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
