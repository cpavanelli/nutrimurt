import { Icon } from './Icon';

type TagProps = {
  answered: boolean;
  answeredLabel?: string;
  pendingLabel?: string;
};

export default function Tag({
  answered,
  answeredLabel = 'Respondido',
  pendingLabel = 'Pendente',
}: TagProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-medium',
        answered
          ? 'border-accent-mid bg-accent-dim text-accent-text'
          : 'border-edge-soft bg-white/5 text-ink-tertiary',
      ].join(' ')}
    >
      {answered && <Icon name="check" size={11} />}
      {answered ? answeredLabel : pendingLabel}
    </span>
  );
}
