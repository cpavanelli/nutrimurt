import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ApiError, useMealPlansApi } from './api';
import type { MealPlanListItem } from './types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

function formatDate(value: string): string {
  if (!value) return '-';
  const [datePart] = value.split('T');
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError
    ? err.message
    : err instanceof Error
      ? err.message
      : fallback;
}

export default function MealPlansPage() {
  const navigate = useNavigate();
  const api = useMealPlansApi();
  const [mealPlans, setMealPlans] = useState<MealPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await api.list();
      const sorted = [...data].sort((a, b) =>
        b.mealPlanDate.localeCompare(a.mealPlanDate)
      );
      setMealPlans(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: number) {
    if (!confirm('Excluir este plano alimentar?')) return;
    try {
      await api.remove(id);
      setMealPlans((prev) => prev.filter((m) => m.id !== id));
      toast.success('Plano excluído');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao excluir'));
    }
  }

  async function handleDownloadPdf(id: number) {
    if (downloadingId !== null) return;
    setDownloadingId(id);
    try {
      await api.downloadPdf(id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao baixar PDF'));
    } finally {
      setDownloadingId(null);
    }
  }

  const filtered = mealPlans.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.patientName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="mb-7 flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold">Planos Alimentares</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {mealPlans.length} plano{mealPlans.length !== 1 ? 's' : ''} cadastrado
            {mealPlans.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          small
          variant="outline"
          icon="plus"
          onClick={() => navigate('/mealplans/new')}
        >
          Novo Plano
        </Button>
      </div>

      <div className="relative mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por plano ou paciente..."
          className="w-full max-w-[360px] rounded-lg border border-edge-soft bg-surface-card px-3.5 py-2.5 text-sm text-ink-primary outline-none transition focus:border-accent-mid"
        />
      </div>

      {loading ? (
        <p className="text-ink-secondary">Carregando planos...</p>
      ) : error ? (
        <p className="text-danger">{error}</p>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-elevated">
              <tr>
                {['Nome', 'Paciente', 'Data do Plano', 'Cadastrado em'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary"
                  >
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.id}
                  className="border-t border-edge-soft transition-colors hover:bg-surface-card-hover"
                >
                  <td className="px-5 py-3.5 font-medium">{m.name}</td>
                  <td className="px-5 py-3.5 text-ink-secondary">{m.patientName}</td>
                  <td className="px-5 py-3.5 font-mono text-[13px] text-ink-secondary">
                    {formatDate(m.mealPlanDate)}
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-ink-tertiary">
                    {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Button
                        small
                        variant="outline"
                        icon="eye"
                        onClick={() => navigate(`/mealplans/${m.id}`)}
                      >
                        Ver
                      </Button>
                      <Button
                        small
                        variant="outline"
                        icon="download"
                        loading={downloadingId === m.id}
                        onClick={() => handleDownloadPdf(m.id)}
                      >
                        PDF
                      </Button>
                      <Button
                        small
                        variant="ghost"
                        icon="edit"
                        onClick={() => navigate(`/mealplans/${m.id}/edit`)}
                      >
                        Editar
                      </Button>
                      <Button
                        small
                        variant="danger"
                        icon="trash"
                        onClick={() => handleDelete(m.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-ink-tertiary">
                    {mealPlans.length === 0
                      ? 'Sem planos ainda. Clique em "Novo Plano" para adicionar um.'
                      : 'Nenhum plano encontrado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
