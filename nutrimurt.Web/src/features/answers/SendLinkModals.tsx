import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import { ApiError, usePatientsApi } from '../patients/api';
import { useQuestionariesApi } from '../questionaries/api';
import SendLinksForm from '../patients/SendLinksForm';
import LoadingOverlay from '../../components/LoadingOverlay';
import { sendEmail } from '../patients/pyApi';
import { copyOrShareLink } from '../patients/linkShare';
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
  const [busyQuestionaryId, setBusyQuestionaryId] = useState<number | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string[]> | null>(null);
  const [questionaries, setQuestionaries] = useState<Questionary[]>([]);

  function getErrorMessage(err: unknown, fallback: string) {
    return err instanceof Error && err.message ? err.message : fallback;
  }

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

  async function handleCopyLink(link: PatientLink) {
    try {
      const result = await copyOrShareLink(`${window.location.origin}/answer/${link.urlId}`);
      if (result === 'copied') toast.success('Link copiado!');
    } catch (err) {
      console.error('Copy failed', err);
    }
  }

  async function handleCreateAndCopy(questionaryId: number) {
    try {
      setBusyQuestionaryId(questionaryId);
      setFormErrors(null);

      await patientsApi.sendLink(patient.id, { type: 'question', questionaryId });
      const refreshedLinks = await patientsApi.links(patient.id);
      onLinksUpdated(refreshedLinks);

      const newLink = refreshedLinks.find(
        l => l.questionnaryId === questionaryId && (l.type === 'question' || l.type === 1),
      );
      if (newLink) {
        const result = await copyOrShareLink(`${window.location.origin}/answer/${newLink.urlId}`);
        if (result === 'copied') toast.success('Link criado e copiado!');
      }
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        const normalized = Object.fromEntries(
          Object.entries(err.validation).map(([k, v]) => [k.toLowerCase(), v]),
        );
        setFormErrors(normalized);
        return;
      }
      alert(err instanceof Error ? err.message : 'Falha ao criar link');
    } finally {
      setBusyQuestionaryId(null);
    }
  }

  async function handleCreateAndEmail(questionaryId: number) {
    try {
      setBusyQuestionaryId(questionaryId);
      setFormErrors(null);

      await patientsApi.sendLink(patient.id, { type: 'question', questionaryId });
      const refreshedLinks = await patientsApi.links(patient.id);
      onLinksUpdated(refreshedLinks);

      const newLink = refreshedLinks.find(
        l => l.questionnaryId === questionaryId && (l.type === 'question' || l.type === 1),
      );
      if (newLink) {
        try {
          const token = await getToken();
          await sendEmail(newLink.urlId, token);
          toast.success('Link criado e e-mail enviado!');
        } catch (err) {
          toast.warn(`Link criado, mas o e-mail não foi enviado. ${getErrorMessage(err, 'Falha ao enviar e-mail')}`);
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.validation) {
        const normalized = Object.fromEntries(
          Object.entries(err.validation).map(([k, v]) => [k.toLowerCase(), v]),
        );
        setFormErrors(normalized);
        return;
      }
      toast.error(getErrorMessage(err, 'Falha ao criar link / enviar e-mail'));
    } finally {
      setBusyQuestionaryId(null);
    }
  }

  async function handleSendEmail(link: PatientLink) {
    try {
      setSubmitting(true);
      const token = await getToken();
      await sendEmail(link.urlId, token);
      toast.success('E-mail enviado com sucesso');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Falha ao enviar e-mail'));
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
                busyQuestionaryId={busyQuestionaryId}
                errors={formErrors || undefined}
                onSubmit={handleSendLink}
                onCreateAndCopy={handleCreateAndCopy}
                onCreateAndEmail={handleCreateAndEmail}
                onCopyLink={handleCopyLink}
                onSendEmail={handleSendEmail}
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
                onCancel={() => setDiaryLinksModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
