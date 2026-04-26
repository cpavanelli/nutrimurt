import { MEAL_TYPE_LABELS } from '../../features/answers/types';

const MEAL_COLORS: Record<number, string> = {
  1: 'oklch(0.78 0.14 80)',
  2: 'oklch(0.72 0.17 168)',
  3: 'oklch(0.72 0.17 55)',
  4: 'oklch(0.72 0.17 280)',
  5: 'oklch(0.72 0.14 15)',
};

type Props = {
  mealType: number;
  className?: string;
};

export default function MealLabel({ mealType, className = '' }: Props) {
  return (
    <span
      className={[
        'text-[11px] font-bold uppercase tracking-[0.1em]',
        className,
      ].join(' ')}
      style={{ color: MEAL_COLORS[mealType] ?? 'var(--accent-text)' }}
    >
      {MEAL_TYPE_LABELS[mealType]}
    </span>
  );
}
