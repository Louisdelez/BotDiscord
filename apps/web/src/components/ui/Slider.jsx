import { cn } from '../../lib/utils';

export function Slider({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '' }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-sm text-[var(--text-secondary)]">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none bg-[var(--bg-tertiary)] accent-[var(--accent)] cursor-pointer"
      />
    </div>
  );
}
