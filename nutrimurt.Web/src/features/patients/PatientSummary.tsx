import type { PatientLink, PatientWithLinks, SendLinksInput } from './types';
import TopHeader from '../../components/TopHeader';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiError, usePatientsApi } from './api';
import type { Questionary } from '../questionaries/types';
import { useQuestionariesApi } from '../questionaries/api';
import SendLinksForm from './SendLinksForm';
import { sendEmail } from './pyApi';
import { toast } from 'react-toastify';
import { copyOrShareLink } from './linkShare';

export default function PatientSummary() {
  const appOrigin = window.location.origin;
  const { patientId } = useParams<{ patientId: string }>();
  const patientsApi = usePatientsApi();
  const questionariesApi = useQuestionariesApi();
  const [patient, setPatient] = useState<PatientWithLinks | null>(null);
  const [questionLinks, setQuestionLinks] = useState<PatientLink[]>([]);
  const [diaryLinks, setDiaryLinks] = useState<PatientLink[]>([]);
  const [questionaries, setQuestionaries] = useState<Questionary[]>([]);
  const [questionLinksModalOpen, setQuestionLinksModalOpen] = useState(false);
  const [diaryLinksModalOpen, setDiaryLinksModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]> | null>(null);

  function syncLinks(links: PatientLink[]) {
    setQuestionLinks(links.filter((link) => link.type === 'question' || link.type === 1));
    setDiaryLinks(links.filter((link) => link.type === 'diary' || link.type === 2));
    setPatient((prev) => (prev ? { ...prev, patientLinks: links } : prev));
  }

  async function loadPatient(id: number) {
    const data = await patientsApi.getWithAll(id);
    setPatient(data);
    syncLinks(data?.patientLinks ?? []);
  }

  useEffect(() => {
    if (!patientId) return;

    const id = Number(patientId);
    if (!Number.isFinite(id)) {
      console.error('Invalid patientId:', patientId);
      return;
    }

    loadPatient(id).catch((error) => {
      console.error('Error fetching patient link:', error);
    });
  }, [patientId]);

  async function openQuestionLinks() {
    if (!patient) return;

    setFormErrors(null);
    setQuestionLinksModalOpen(true);

    try {
      setSubmitting(true);
      const [qs, links] = await Promise.all([
        questionariesApi.list(),
        patientsApi.links(patient.id),
      ]);
      setQuestionaries(qs);
      syncLinks(links);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao carregar links/questionarios');
    } finally {
      setSubmitting(false);
    }
  }

  async function openDiaryLinks() {
    if (!patient) return;

    setFormErrors(null);
    setDiaryLinksModalOpen(true);

    try {
      setSubmitting(true);
      const links = await patientsApi.links(patient.id);
      syncLinks(links);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao carregar links');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendLink(payload: SendLinksInput) {
    if (!patient) return;

    try {
      setSubmitting(true);
      setFormErrors(null);

      const updated = await patientsApi.sendLink(patient.id, payload);
      if (updated?.length) {
        await sendEmail(updated[0].urlId);
      }

      const refreshedLinks = await patientsApi.links(patient.id);
      syncLinks(refreshedLinks);

      setQuestionLinksModalOpen(false);
      setDiaryLinksModalOpen(false);
      toast.success('E-mail enviado com sucesso');
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
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 lg:px-10">
        <TopHeader />
        <div className="mt-4">
          <Link to="/" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200">
            Voltar
          </Link>
        </div>

        <section className="grid flex-1 gap-6 py-8">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl ">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
              <span>Resumo do paciente</span>
            </div>
            <div className="space-y-4">
              <p><strong>Nome:</strong> {patient?.name}</p>
              <p><strong>Email:</strong> {patient?.email}</p>
              <p><strong>Telefone:</strong> {patient?.phone}</p>
              <p><strong>CPF:</strong> {patient?.cpf}</p>
              <p><strong>Data de Nascimento:</strong> {patient?.birth}</p>
              <p><strong>Peso:</strong> {patient?.weight} kg</p>
              <p><strong>Altura:</strong> {patient?.height} cm</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={openQuestionLinks}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                >
                  Enviar Questionário
                </button>
                <button
                  onClick={openDiaryLinks}
                  className="rounded-full border border-cyan-300/60 bg-cyan-400/20 px-5 py-2 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-cyan-400/30"
                >
                  Enviar Diário
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid flex-1 gap-6 py-8">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
              <span>Questionarios Enviados</span>
            </div>


            <div className="grid grid-cols-5 font-semibold border-b pb-2 ">
              <span>Questionário</span>
              <span>Respondido?</span>
              <span>Data</span>
              <span></span>
              <span></span>
            </div>

            {questionLinks.map((u) => (
              <div key={u.id} className="grid grid-cols-5 items-center py-3 border-b bg-slate-900/60 p-4 shadow">
                <span>{u.questionnaryName}</span>
                <span>
                  {(u.lastAnswered) ? <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-400 bg-emerald-500 text-slate-950'}>✓</span> :
                    <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-slate-600 bg-slate-800 text-transparent'}>✓</span>}
                </span>
                <span>{u.lastAnswered ?? '-'}</span>
                <span>
                  <Link
                    to={`/viewAnswer/${u.urlId}`}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                  >Ver</Link>
                </span>
                <span>
                  <button type="button" className="text-blue-400 hover:underline focus:outline-none"
                    onClick={async () => {
                      try {
                        const result = await copyOrShareLink(`${appOrigin}/answer/${u.urlId}`);
                        if (result === 'copied') {
                          toast.success('Link copiado!');
                        }
                      } catch (err) {
                        console.error("Copy failed", err);
                      }
                    }}
                    aria-label="Copiar link"
                  >
                    Copiar Link
                  </button>
                </span>
              </div>
            ))}
          </div>

        </section>

        <section className="grid flex-1 gap-6 py-8">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
              <span>Diarios Alimentares</span>
            </div>
            <div className="grid grid-cols-5 font-semibold border-b pb-2 ">
              <span>Diário</span>
              <span>Respondido?</span>
              <span>Data</span>
              <span></span>
              <span></span>
            </div>

            {diaryLinks.map((u) => (
              <div key={u.id} className="grid grid-cols-5 items-center py-3 border-b bg-slate-900/60 p-4 shadow">
                <span>{u.diaryName}</span>
                <span>
                  {(u.lastAnswered) ? <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-400 bg-emerald-500 text-slate-950'}>✓</span> :
                    <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-slate-600 bg-slate-800 text-transparent'}>✓</span>}
                </span>
                <span>{u.lastAnswered ?? '-'}</span>
                <span>
                  <Link
                    to={`/viewAnswer/${u.urlId}`}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 hover:bg-emerald-400"
                  >Ver</Link>
                </span>
                <span>
                  <button type="button" className="text-blue-400 hover:underline focus:outline-none"
                    onClick={async () => {
                      try {
                        const result = await copyOrShareLink(`${appOrigin}/answer/${u.urlId}`);
                        if (result === 'copied') {
                          toast.success('Link copiado!');
                        }
                      } catch (err) {
                        console.error("Copy failed", err);
                      }
                    }}
                    aria-label="Copiar link"
                  >
                    Copiar Link
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {questionLinksModalOpen && patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">Enviar Questionário</h2>
            <SendLinksForm
              patient={patient}
              mode="question"
              links={questionLinks}
              questionaries={questionaries}
              submitting={submitting}
              errors={formErrors || undefined}
              onSubmit={handleSendLink}
              onCancel={() => setQuestionLinksModalOpen(false)}
            />
          </div>
        </div>
      )}

      {diaryLinksModalOpen && patient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold mb-4">Enviar Diário</h2>
            <SendLinksForm
              patient={patient}
              mode="diary"
              links={diaryLinks}
              questionaries={[]}
              submitting={submitting}
              errors={formErrors || undefined}
              onSubmit={handleSendLink}
              onCancel={() => setDiaryLinksModalOpen(false)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

