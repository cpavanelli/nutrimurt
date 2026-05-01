import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'ghost' | 'outline' | 'danger';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent text-[#0b0f1a] hover:brightness-110',
  ghost: 'bg-transparent text-ink-secondary border border-edge-soft hover:bg-surface-elevated',
  outline: 'bg-transparent text-accent-text border border-accent-mid hover:bg-accent-dim',
  danger: 'bg-danger-dim text-danger border border-danger-mid hover:bg-danger hover:text-white',
};

type ButtonProps = {
  children?: ReactNode;
  variant?: Variant;
  small?: boolean;
  icon?: IconName;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  children,
  variant = 'primary',
  small = false,
  icon,
  loading = false,
  disabled,
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  const renderIcon = loading ? 'loader' : icon;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        small ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-sm',
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
      {...rest}
    >
      {renderIcon && (
        <Icon
          name={renderIcon}
          size={small ? 12 : 14}
          className={loading ? 'animate-spin' : undefined}
        />
      )}
      {children}
    </button>
  );
}
