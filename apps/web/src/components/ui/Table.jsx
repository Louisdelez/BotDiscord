import { cn } from '../../lib/utils';

export function Table({ className, children }) {
  return (
    <div className={cn('overflow-x-auto rounded-xl border border-[var(--border)]', className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({ children }) {
  return <thead className="bg-[var(--bg-secondary)]">{children}</thead>;
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr className={cn('border-b border-[var(--border)] last:border-0', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ className, children }) {
  return (
    <th className={cn('px-4 py-3 text-left font-medium text-[var(--text-secondary)]', className)}>
      {children}
    </th>
  );
}

export function TableCell({ className, children }) {
  return <td className={cn('px-4 py-3 text-[var(--text-primary)]', className)}>{children}</td>;
}
