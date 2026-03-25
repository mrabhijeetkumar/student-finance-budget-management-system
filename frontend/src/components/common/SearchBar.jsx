export default function SearchBar({ value, onChange }) {
  return (
    <input
      className="input"
      placeholder="Search by note or category"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
