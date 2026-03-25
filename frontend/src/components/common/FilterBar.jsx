import { EXPENSE_CATEGORIES } from "../../constants/categories";

export default function FilterBar({ value, onChange }) {
  return (
    <select className="input" value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="All">All</option>
      {EXPENSE_CATEGORIES.map((category) => (
        <option key={category} value={category}>
          {category}
        </option>
      ))}
    </select>
  );
}
