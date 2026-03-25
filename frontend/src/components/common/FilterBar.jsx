const CATEGORIES = ["All", "Food", "Travel", "Bills", "Shopping", "Health", "Education", "Other"];

export default function FilterBar({ value, onChange }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      {CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
