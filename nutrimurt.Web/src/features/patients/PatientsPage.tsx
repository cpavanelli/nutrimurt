import { useEffect, useState } from 'react';
import { ApiError, patientsApi } from './api';
import type { Patient, PatientInput, PatientLink, SendLinksInput } from './types';
import PatientForm from './PatientForm';
import { sendEmail } from './pyApi';
import MaintenanceHeader from '../../components/MaintenanceHeader';
import type { Questionary } from '../questionaries/types';
import { questionariesApi } from '../questionaries/api';
import SendLinksForm from './SendLinksForm';

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | 'links' | null>(null);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]> | null>(null);
  const [patientLinks, setPatientLinks] = useState<PatientLink[]>([]);
  const [questionaries, setQuestionaries] = useState<Questionary[]>([]);


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

  async function openLinks(patient: Patient) {
    setSelected(patient);
    setFormErrors(null);
    setModal('links');
    try {
      setSubmitting(true);
      const [qs, links] = await Promise.all([
        questionariesApi.list(),
        patientsApi.links(patient.id)
      ]);
      setQuestionaries(qs);
      setPatientLinks(links);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao carregar links/questionários');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(payload: PatientInput) {
    try {
      setSubmitting(true);
      setFormErrors(null);
      payload.birth = payload.birth ? payload.birth : null; // or delete if falsy
      if (modal === 'edit' && selected) {
        await patientsApi.update(selected.id, payload);
      } else {
        await patientsApi.create(payload);
      }
      await load();
      setModal(null);
      setSelected(null);
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        const normalized = Object.fromEntries(
          Object.entries(err.validation).map(([k, v]) => [k.toLowerCase(), v])
        );
        setFormErrors(normalized);
        return; // keep modal open and show errors
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

  async function handleSendLink(payload: SendLinksInput) {
    if (!selected) return;
    try {
      setSubmitting(true);
      setFormErrors(null);
      const updated = await patientsApi.sendLink(selected.id, payload); // returns PatientLink[] or undefined
      if (updated) setPatientLinks(updated);
      setModal(null);
      setSelected(null);

      //call python api to send email
      await sendEmail(updated[0].urlId);

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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <MaintenanceHeader title="Pacientes" addNewTitle="Novo Paciente" openCreate={openCreate} />
      <main className="mx-auto max-w-5xl px-6 py-8">
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
                      {header === "Created" ? "Criado em" : header}
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
                        className="mr-3 text-emerald-400 hover:text-emerald-300"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => openLinks(patient)}
                        className="mr-3 text-blue-400 hover:text-blue-300"
                      >
                        Enviar Links
                      </button>
                      <button
                        onClick={() => handleDelete(patient.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      Sem pacientes ainda. Clique em “Novo Paciente” para adicionar um.
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
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">

            {modal === 'links' ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Enviar Links</h2>
                {selected && (
                  <SendLinksForm
                    patient={selected}
                    links={patientLinks}
                    questionaries={questionaries}
                    submitting={submitting}
                    errors={formErrors || undefined}
                    onSubmit={handleSendLink}
                    onCancel={() => setModal(null)}
                  />
                )}
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div >
      )
      }
    </div >
  );
}
