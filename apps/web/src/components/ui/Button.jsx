import { cn } from '../../lib/utils';

const variants = {
  primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] active:scale-[0.98]',
  secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:opacity-80 active:scale-[0.98]',
  danger: 'bg-[var(--danger)] text-white hover:opacity-90 active:scale-[0.98]',
  ghost: 'text-[var(--accent)] hover:bg-[var(--bg-secondary)]',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
