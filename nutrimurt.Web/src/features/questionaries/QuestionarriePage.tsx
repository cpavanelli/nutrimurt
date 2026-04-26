import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useQuestionariesApi } from './api';
import type { Questionary, QuestionaryInput } from './types';
import QuestionarrieForm from './QuestionarrieForm';
import LoadingOverlay from '../../components/LoadingOverlay';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';

export default function QuestionarryPage() {
  const questionariesApi = useQuestionariesApi();
  const [questionaries, setQuestionaries] = useState<Questionary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Questionary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await questionariesApi.list();
      setQuestionaries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setSelected(null);
    setModal('create');
  }

  function openEdit(questionary: Questionary) {
    setSelected(questionary);
    setModal('edit');
  }

  async function handleSubmit(payload: QuestionaryInput) {
    try {
      setSubmitting(true);
      if (modal === 'edit' && selected) {
        await questionariesApi.update(selected.id, payload);
      } else {
        await questionariesApi.create(payload);
      }
      toast.success('Questionário cadastrado com sucesso');
      await load();
      setModal(null);
      setSelected(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Apagar este questionário?')) return;
    try {
      await questionariesApi.remove(id);
      setQuestionaries((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <>
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold">Questionários</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {questionaries.length} questionário{questionaries.length !== 1 ? 's' : ''} cadastrado
              {questionaries.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button small variant="outline" icon="plus" onClick={openCreate}>
            Novo Questionário
          </Button>
        </div>

        {loading ? (
          <p className="text-ink-secondary">Carregando questionários...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated">
                <tr>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                    Nome
                  </th>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                    Criado em
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {questionaries.map((q) => (
                  <tr
                    key={q.id}
                    className="border-t border-edge-soft transition-colors hover:bg-surface-card-hover"
                  >
                    <td className="px-5 py-3.5 font-medium">{q.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-tertiary">
                      {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button small variant="ghost" icon="edit" onClick={() => openEdit(q)}>
                          Editar
                        </Button>
                        <Button small variant="danger" icon="trash" onClick={() => handleDelete(q.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {questionaries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-10 text-center text-ink-tertiary">
                      Sem Questionários ainda. Clique em "Novo Questionário" para adicionar um.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div className="modal-scrollbar relative my-6 max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-edge-medium bg-surface-panel p-7 shadow-2xl">
            <LoadingOverlay visible={submitting} label="Salvando..." />
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {modal === 'edit' ? 'Editar Questionário' : 'Novo Questionário'}
              </h2>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="text-ink-secondary transition hover:text-ink-primary"
                aria-label="Fechar"
              >
                <Icon name="x" size={20} />
              </button>
            </div>
            <QuestionarrieForm
              initial={selected}
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
