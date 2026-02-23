import { useEffect, useState } from 'react';
import {  questionariesApi } from './api';
import type { Questionary, QuestionaryInput } from './types';
import QuestionarrieForm from './QuestionarrieForm';
import MaintenanceHeader from '../../components/MaintenanceHeader';
import { toast } from 'react-toastify';

export default function QuestionarryPage() {
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
    if (!confirm('Delete this questionary?')) return;
    try {
      await questionariesApi.remove(id);
      setQuestionaries((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MaintenanceHeader title="Questionários" addNewTitle="Novo Questionário" openCreate={openCreate} />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {loading ? (
          <p className="text-slate-400">Loading questionaries...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800 shadow">
            <table className="min-w-full divide-y divide-slate-800 bg-slate-900">
              <thead className="bg-slate-900/70">
                <tr>
                  {['Nome'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {header}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {questionaries.map((questionary) => (
                  <tr key={questionary.id}>
                    <td className="px-4 py-3">{questionary.name}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => openEdit(questionary)}
                        className="mr-3 text-emerald-400 hover:text-emerald-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(questionary.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {questionaries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      Sem Questionários ainda. Clique em “Novo Questionário” para adicionar um.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">
              {modal === 'edit' ? 'Editar Questionário' : 'Novo Questionário'}
            </h2>
            <QuestionarrieForm
              initial={selected}
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
