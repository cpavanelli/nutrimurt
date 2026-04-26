import { Link } from 'react-router-dom';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';
import Spinner from '../../components/Spinner';
import type { RecentPatient } from './types';

type Props = {
  patients: RecentPatient[];
  loading?: boolean;
};

export default function RecentPatients({ patients, loading = false }: Props) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
          Pacientes Recentes
        </span>
        <Link
          to="/patients"
          className="flex items-center gap-1 text-[13px] text-accent-text transition hover:opacity-80"
        >
          Ver todos
          <Icon name="chevronRight" size={14} />
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        >
          {patients.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              to={`/patientSummary/${p.id}`}
              className="group flex items-center gap-3 rounded-[10px] border border-edge-soft bg-surface-elevated px-4 py-3.5 transition hover:border-edge-medium hover:bg-surface-card-hover focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={`Ver paciente ${p.name}`}
            >
              <Avatar name={p.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="truncate text-xs text-ink-secondary">{p.email}</div>
              </div>
              <span className="text-ink-tertiary transition group-hover:text-ink-primary">
                <Icon name="chevronRight" size={16} />
              </span>
            </Link>
          ))}
          {patients.length === 0 && (
            <div className="text-sm text-ink-tertiary">Nenhum paciente cadastrado</div>
          )}
        </div>
      )}
    </Card>
  );
}
