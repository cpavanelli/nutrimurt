import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import { ApiError, usePatientsApi } from '../patients/api';
import { useQuestionariesApi } from '../questionaries/api';
import SendLinksForm from '../patients/SendLinksForm';
import LoadingOverlay from '../../components/LoadingOverlay';
import { sendEmail } from '../patients/pyApi';
import type { PatientLink, PatientWithLinks, SendLinksInput } from '../patients/types';
import type { Questionary } from '../questionaries/types';

interface SendLinkModalsProps {
  patient: PatientWithLinks;
  questionLinks: PatientLink[];
  diaryLinks: PatientLink[];
  onLinksUpdated: (links: PatientLink[]) => void;
}

export default function SendLinkModals({
  patient,
  questionLinks,
  diaryLinks,
  onLinksUpdated,
}: SendLinkModalsProps) {
  const { getToken } = useAuth();
  const patientsApi = usePatientsApi();
  const questionariesApi = useQuestionariesApi();

  const [questionLinksModalOpen, setQuestionLinksModalOpen] = useState(false);
  const [diaryLinksModalOpen, setDiaryLinksModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string[]> | null>(null);
  const [questionaries, setQuestionaries] = useState<Questionary[]>([]);

  async function openQuestionLinks() {
    setFormErrors(null);
    setQuestionLinksModalOpen(true);

    try {
      setSubmitting(true);
      const [qs, links] = await Promise.all([
        questionariesApi.list(),
        patientsApi.links(patient.id),
      ]);
      setQuestionaries(qs);
      onLinksUpdated(links);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao carregar links/questionarios');
    } finally {
      setSubmitting(false);
    }
  }

  async function openDiaryLinks() {
    setFormErrors(null);
    setDiaryLinksModalOpen(true);

    try {
      setSubmitting(true);
      const links = await patientsApi.links(patient.id);
      onLinksUpdated(links);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao carregar links');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendLink(payload: SendLinksInput) {
    try {
      setSubmitting(true);
      setFormErrors(null);

      await patientsApi.sendLink(patient.id, payload);

      const refreshedLinks = await patientsApi.links(patient.id);
      onLinksUpdated(refreshedLinks);

      toast.success('Link criado com sucesso');
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        const normalized = Object.fromEntries(
          Object.entries(err.validation).map(([k, v]) => [k.toLowerCase(), v]),
        );
        setFormErrors(normalized);
        return;
      }
      alert(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendEmail(link: PatientLink) {
    try {
      setSubmitting(true);
      const token = await getToken();
      await sendEmail(link.urlId, token);
      toast.success('E-mail enviado com sucesso');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao enviar e-mail');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteLink(link: PatientLink) {
    const itemName =
      link.type === 'diary' || link.type === 2
        ? link.diaryName ?? 'este diário'
        : link.questionnaryName;

    if (!window.confirm(`Excluir o link "${itemName}"?`)) {
      return;
    }

    try {
      setSubmitting(true);
      await patientsApi.deleteLink(patient.id, link.id);

      const refreshedLinks = await patientsApi.links(patient.id);
      onLinksUpdated(refreshedLinks);

      toast.success('Link excluído com sucesso');
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        const normalized = Object.fromEntries(
          Object.entries(err.validation).map(([k, v]) => [k.toLowerCase(), v]),
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
    <>
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

      {questionLinksModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="flex min-h-full items-start justify-center py-6">
            <div className="relative modal-scrollbar w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-scroll rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <LoadingOverlay visible={submitting} label="Processando..." />
            <h2 className="text-xl font-semibold mb-4">Enviar Questionário</h2>
              <SendLinksForm
                patient={patient}
                mode="question"
                links={questionLinks}
                questionaries={questionaries}
                submitting={submitting}
                errors={formErrors || undefined}
                onSubmit={handleSendLink}
                onSendEmail={handleSendEmail}
                onDeleteLink={handleDeleteLink}
                onCancel={() => setQuestionLinksModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {diaryLinksModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="flex min-h-full items-start justify-center py-6">
            <div className="relative modal-scrollbar w-full max-w-lg max-h-[calc(100vh-3rem)] overflow-y-scroll rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <LoadingOverlay visible={submitting} label="Processando..." />
            <h2 className="text-xl font-semibold mb-4">Enviar Diário</h2>
              <SendLinksForm
                patient={patient}
                mode="diary"
                links={diaryLinks}
                questionaries={[]}
                submitting={submitting}
                errors={formErrors || undefined}
                onSubmit={handleSendLink}
                onSendEmail={handleSendEmail}
                onDeleteLink={handleDeleteLink}
                onCancel={() => setDiaryLinksModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
