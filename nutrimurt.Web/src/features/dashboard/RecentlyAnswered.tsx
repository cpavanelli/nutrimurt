import { Link } from 'react-router-dom';
import type { DashboardPatientLink } from './types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/Spinner';

type Props = {
  links: DashboardPatientLink[];
  loading?: boolean;
};

export default function RecentlyAnswered({ links, loading = false }: Props) {
  return (
    <Card>
      <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
        Questionários Respondidos
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="md" />
        </div>
      ) : (
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-ink-tertiary">
              {['Paciente', 'Questionário', 'Data', ''].map((h) => (
                <th
                  key={h}
                  className="pb-2.5 pr-2 text-left text-xs font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {links.map((u) => (
              <tr key={u.id} className="border-t border-edge-soft">
                <td className="py-2.5 pr-2">{u.patientName}</td>
                <td className="py-2.5 pr-2 text-ink-secondary">{u.questionnaryName}</td>
                <td className="whitespace-nowrap py-2.5 pr-2 font-mono text-[11px] text-ink-tertiary">
                  {u.lastAnswered ?? '-'}
                </td>
                <td className="py-2.5">
                  <Link to={`/viewAnswer/${u.urlId}`}>
                    <Button small variant="outline" icon="eye">
                      Ver
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-ink-tertiary">
                  Nenhum questionário respondido ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Card>
  );
}
