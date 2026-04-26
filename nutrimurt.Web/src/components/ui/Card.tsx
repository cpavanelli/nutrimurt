import type { ReactNode } from 'react';

type CardProps = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
};

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'rounded-xl border border-edge-soft bg-surface-card p-5 transition-colors',
        onClick ? 'cursor-pointer hover:border-edge-medium' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
