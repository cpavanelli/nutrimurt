import Card from '../../components/ui/Card';
import { Icon, type IconName } from '../../components/ui/Icon';

type StatCardProps = {
  icon: IconName;
  label: string;
  value: number | string;
  iconColor?: string;
};

export default function StatCard({ icon, label, value, iconColor = 'var(--accent)' }: StatCardProps) {
  return (
    <Card className="flex items-center gap-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]"
        style={{
          background: `color-mix(in srgb, ${iconColor} 13%, transparent)`,
          color: iconColor,
        }}
      >
        <Icon name={icon} size={20} />
      </span>
      <div>
        <div className="text-[26px] font-bold leading-none">{value}</div>
        <div className="mt-1 text-xs text-ink-secondary">{label}</div>
      </div>
    </Card>
  );
}
