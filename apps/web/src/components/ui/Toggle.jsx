import { cn } from '../../lib/utils';

export function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer group">
      <div>
        {label && <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>}
        {description && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 cursor-pointer',
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--bg-tertiary)]'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-[27px] w-[27px] rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-[2px]',
            checked ? 'translate-x-[22px]' : 'translate-x-[2px]'
          )}
        />
      </button>
    </label>
  );
}
