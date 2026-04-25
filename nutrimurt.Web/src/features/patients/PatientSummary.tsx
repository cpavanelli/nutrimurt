import type { PatientLink, PatientWithLinks } from './types';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePatientsApi } from './api';
import { toast } from 'react-toastify';
import { copyOrShareLink } from './linkShare';
import SendLinkModals from '../answers/SendLinkModals';

export default function PatientSummary() {
  const appOrigin = window.location.origin;
  const { patientId } = useParams<{ patientId: string }>();
  const patientsApi = usePatientsApi();
  const [patient, setPatient] = useState<PatientWithLinks | null>(null);
  const [questionLinks, setQuestionLinks] = useState<PatientLink[]>([]);
  const [diaryLinks, setDiaryLinks] = useState<PatientLink[]>([]);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function handleDeleteLink(link: PatientLink) {
    const itemName =
      link.type === 'diary' || link.type === 2
        ? link.diaryName ?? 'este diário'
        : link.questionnaryName;

    if (!window.confirm(`Excluir o link "${itemName}"?`)) return;
    if (!patient) return;

    try {
      setDeleting(link.id);
      await patientsApi.deleteLink(patient.id, link.id);
      const refreshedLinks = await patientsApi.links(patient.id);
      syncLinks(refreshedLinks);
      toast.success('Link excluído com sucesso');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir link');
    } finally {
      setDeleting(null);
    }
  }

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

  return (
    <div className="mx-auto max-w-6xl px-6 pb-16 pt-10 lg:px-10">
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200">
          Voltar
        </Link>
      </div>

      <section className="grid gap-6">
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
              {patient && (
                <SendLinkModals
                  patient={patient}
                  questionLinks={questionLinks}
                  diaryLinks={diaryLinks}
                  onLinksUpdated={syncLinks}
                />
              )}
            </div>
          </div>
        </section>

        <section className="grid flex-1 gap-6 py-8">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between text-xs uppercase tracking-[0.4em] text-slate-300">
              <span>Questionarios Enviados</span>
            </div>


            <div className="grid grid-cols-6 font-semibold border-b pb-2 ">
              <span>Questionário</span>
              <span>Respondido?</span>
              <span>Data</span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            {questionLinks.map((u) => (
              <div key={u.id} className="grid grid-cols-6 items-center py-3 border-b bg-slate-900/60 p-4 shadow">
                <span>{u.questionnaryName}</span>
                <span>
                  {(u.lastAnswered) ? <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-400 bg-emerald-500 text-slate-950'}>✓</span> :
                    <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-slate-600 bg-slate-800 text-transparent'}>✓</span>}
                </span>
                <span>{u.lastAnswered ?? '-'}</span>
                <span>
                  <Link
                    to={`/viewAnswer/${u.urlId}`}
                    className="rounded border border-slate-500/60 bg-slate-500/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-500/20"
                  >Ver</Link>
                </span>
                <span>
                  <button type="button" className="rounded border border-slate-500/60 bg-slate-500/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-500/20"
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
                <span>
                  <button
                    type="button"
                    className="rounded border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handleDeleteLink(u)}
                    disabled={deleting === u.id}
                  >
                    Excluir
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
            <div className="grid grid-cols-6 font-semibold border-b pb-2 ">
              <span>Diário</span>
              <span>Respondido?</span>
              <span>Data</span>
              <span></span>
              <span></span>
              <span></span>
            </div>

            {diaryLinks.map((u) => (
              <div key={u.id} className="grid grid-cols-6 items-center py-3 border-b bg-slate-900/60 p-4 shadow">
                <span>{u.diaryName}</span>
                <span>
                  {(u.lastAnswered) ? <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-emerald-400 bg-emerald-500 text-slate-950'}>✓</span> :
                    <span className={'inline-flex h-5 w-5 items-center justify-center rounded border border-slate-600 bg-slate-800 text-transparent'}>✓</span>}
                </span>
                <span>{u.lastAnswered ?? '-'}</span>
                <span>
                  <Link
                    to={`/viewAnswer/${u.urlId}`}
                    className="rounded border border-slate-500/60 bg-slate-500/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-500/20"
                  >Ver</Link>
                </span>
                <span>
                  <button type="button" className="rounded border border-slate-500/60 bg-slate-500/10 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-500/20"
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
                <span>
                  <button
                    type="button"
                    className="rounded border border-rose-500/60 bg-rose-500/10 px-3 py-1.5 text-sm font-medium text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => handleDeleteLink(u)}
                    disabled={deleting === u.id}
                  >
                    Excluir
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>
    </div>
  );
}

