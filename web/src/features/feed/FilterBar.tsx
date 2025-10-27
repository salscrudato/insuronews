import type { Category } from "../../lib/types";

const ALL: Category[] = ["Regulatory", "Catastrophe", "Auto", "Homeowners", "Commercial", "Reinsurance", "Claims", "InsurTech", "M&A", "Cyber", "Pricing"];

export default function FilterBar({ selected, onChange }: { selected: Category[], onChange: (v: Category[]) => void }) {
  const toggle = (c: Category) => onChange(selected.includes(c) ? selected.filter(x => x !== c) : [...selected, c]);
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {ALL.map(c => (
        <button key={c} onClick={() => toggle(c)}
          className={`text-xs px-3 py-1 rounded-full border transition ${selected.includes(c) ? "bg-ink text-white border-ink" : "bg-white border-gray-200 hover:border-gray-300"}`}>
          {c}
        </button>
      ))}
      {selected.length > 0 && <button className="text-xs ml-2 underline text-subtle hover:text-ink" onClick={() => onChange([])}>Clear</button>}
    </div>
  );
}

