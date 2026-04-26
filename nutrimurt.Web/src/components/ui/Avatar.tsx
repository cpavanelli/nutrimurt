type Size = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'w-8 h-8 text-[13px] border',
  md: 'w-[38px] h-[38px] text-sm border',
  lg: 'w-14 h-14 text-[22px] border-2',
};

type AvatarProps = {
  name?: string;
  size?: Size;
};

export default function Avatar({ name, size = 'sm' }: AvatarProps) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  return (
    <span
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full border-accent-mid bg-accent-dim font-semibold text-accent-text',
        SIZE_CLASSES[size],
      ].join(' ')}
    >
      {initial}
    </span>
  );
}
