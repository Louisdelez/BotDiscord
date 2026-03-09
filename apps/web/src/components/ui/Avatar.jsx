import { cn } from '../../lib/utils';

export function Avatar({ src, alt, size = 'md', className }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-16 h-16' };

  return (
    <div className={cn('rounded-full overflow-hidden bg-[var(--bg-tertiary)] shrink-0', sizes[size], className)}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)] font-medium">
          {alt?.[0]?.toUpperCase() || '?'}
        </div>
      )}
    </div>
  );
}
