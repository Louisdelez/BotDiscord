import { cn } from '../../lib/utils';

const variants = {
  default: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
  success: 'bg-[var(--success)]/15 text-[var(--success)]',
  danger: 'bg-[var(--danger)]/15 text-[var(--danger)]',
  warning: 'bg-[var(--warning)]/15 text-[var(--warning)]',
  info: 'bg-[var(--accent)]/15 text-[var(--accent)]',
};

export function Badge({ variant = 'default', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
