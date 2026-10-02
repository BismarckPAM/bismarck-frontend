import { cn } from '@/lib/cn';

export function BismarckMark({ className }: { className?: string }) {
  return (
    <img
      src="/favicon.svg"
      alt="Bismarck Logo"
      style={{ width: '66px', height: '66px', minWidth: '66px' }}
      className={cn('object-contain shrink-0', className)}
    />
  );
}

export function BismarckLogo({
  className,
  markClassName,
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('lnd-brand', className)}>
      <BismarckMark className={markClassName} />
      {!compact && (
        <span className="lnd-brand-text">
          <span className="lnd-brand-name">Bismarck</span>
          <span className="lnd-brand-tag">PAM Platform</span>
        </span>
      )}
    </span>
  );
}
