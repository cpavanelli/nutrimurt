import { useEffect, useState } from 'react';
import { ApiError, usePatientsApi } from './api';
import type { Patient, PatientInput } from './types';
import PatientForm from './PatientForm';
import LoadingOverlay from '../../components/LoadingOverlay';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export default function PatientsPage() {
  const navigate = useNavigate();
  const patientsApi = usePatientsApi();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]> | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await patientsApi.list();
      setPatients(data);
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
    setFormErrors(null);
    setModal('create');
  }

  function openEdit(patient: Patient) {
    setSelected(patient);
    setFormErrors(null);
    setModal('edit');
  }

  async function handleSubmit(payload: PatientInput) {
    try {
      setSubmitting(true);
      setFormErrors(null);
      payload.birth = payload.birth ? payload.birth : null;
      if (modal === 'edit' && selected) {
        await patientsApi.update(selected.id, payload);
      } else {
        await patientsApi.create(payload);
      }
      toast.success('Paciente cadastrado com sucesso');
      await load();
      setModal(null);
      setSelected(null);
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        const normalized = Object.fromEntries(
          Object.entries(err.validation).map(([k, v]) => [k.toLowerCase(), v])
        );
        setFormErrors(normalized);
        return;
      }
      alert(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this patient?')) return;
    try {
      await patientsApi.remove(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Pacientes</h1>
          <button
            onClick={openCreate}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
          >
            + Novo Paciente
          </button>
        </div>
        {loading ? (
          <p className="text-slate-400">Carregando pacientes...</p>
        ) : error ? (
          <p className="text-red-400">{error}</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800 shadow">
            <table className="min-w-full divide-y divide-slate-800 bg-slate-900">
              <thead className="bg-slate-900/70">
                <tr>
                  {['Name', 'Email', 'Phone', 'Created'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {header === 'Created' ? 'Criado em' : header}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {patients.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-4 py-3">{patient.name}</td>
                    <td className="px-4 py-3">{patient.email}</td>
                    <td className="px-4 py-3">{patient.phone}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => openEdit(patient)}
                        className="mr-2 rounded border border-slate-500/60 bg-slate-500/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-500/20"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(patient.id)}
                        className="mr-2 rounded border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/20"
                      >
                        Deletar
                      </button>
                      <button
                        onClick={() => navigate(`/patientSummary/${patient.id}`)}
                        className="rounded border border-sky-500/60 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-400 transition hover:bg-sky-500/20"
                      >
                        Resumo
                      </button>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      Sem pacientes ainda. Clique em "Novo Paciente" para adicionar um.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="flex min-h-full items-start justify-center py-6">
            <div className="relative modal-scrollbar w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-scroll rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
              <LoadingOverlay visible={submitting} label="Salvando..." />
              <h2 className="text-xl font-semibold mb-4">
                {modal === 'edit' ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <PatientForm
                initial={selected}
                submitting={submitting}
                onSubmit={handleSubmit}
                errors={formErrors || undefined}
                onCancel={() => setModal(null)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
