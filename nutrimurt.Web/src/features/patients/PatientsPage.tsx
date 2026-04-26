import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ApiError, usePatientsApi } from './api';
import type { Patient, PatientInput } from './types';
import PatientForm from './PatientForm';
import LoadingOverlay from '../../components/LoadingOverlay';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { Icon } from '../../components/ui/Icon';

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
  const [search, setSearch] = useState('');

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
    if (!confirm('Excluir este paciente?')) return;
    try {
      await patientsApi.remove(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex-1 overflow-auto p-8">
        <div className="mb-7 flex items-start justify-between">
          <div>
            <h1 className="text-[22px] font-semibold">Pacientes</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {patients.length} paciente{patients.length !== 1 ? 's' : ''} cadastrado
              {patients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button icon="plus" onClick={openCreate}>
            Novo Paciente
          </Button>
        </div>

        <div className="relative mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar paciente..."
            className="w-full max-w-[360px] rounded-lg border border-edge-soft bg-surface-card px-3.5 py-2.5 text-sm text-ink-primary outline-none transition focus:border-accent-mid"
          />
        </div>

        {loading ? (
          <p className="text-ink-secondary">Carregando pacientes...</p>
        ) : error ? (
          <p className="text-danger">{error}</p>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface-elevated">
                <tr>
                  {['Nome', 'Email', 'Telefone', 'Cadastrado em'].map((h) => (
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
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-edge-soft transition-colors hover:bg-surface-card-hover"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={p.name} size="sm" />
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-ink-secondary">{p.email}</td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-ink-secondary">{p.phone}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-ink-tertiary">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-2">
                        <Button small variant="ghost" icon="edit" onClick={() => openEdit(p)}>
                          Editar
                        </Button>
                        <Button small variant="danger" icon="trash" onClick={() => handleDelete(p.id)}>
                          Deletar
                        </Button>
                        <Button
                          small
                          variant="outline"
                          icon="eye"
                          onClick={() => navigate(`/patientSummary/${p.id}`)}
                        >
                          Resumo
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-ink-tertiary">
                      {patients.length === 0
                        ? 'Sem pacientes ainda. Clique em "Novo Paciente" para adicionar um.'
                        : 'Nenhum paciente encontrado'}
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
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div className="modal-scrollbar relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge-medium bg-surface-panel p-7 shadow-2xl">
            <LoadingOverlay visible={submitting} label="Salvando..." />
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {modal === 'edit' ? 'Editar Paciente' : 'Novo Paciente'}
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
            <PatientForm
              initial={selected}
              submitting={submitting}
              onSubmit={handleSubmit}
              errors={formErrors || undefined}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}
