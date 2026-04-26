import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import LoadingOverlay from '../../components/LoadingOverlay';
import Button from '../../components/ui/Button';
import { ApiError, usePatientsApi } from '../patients/api';
import SendLinksForm from '../patients/SendLinksForm';
import { sendEmail } from '../patients/pyApi';
import { copyOrShareLink } from '../patients/linkShare';
import { useQuestionariesApi } from '../questionaries/api';
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
      const [qs, links] = await Promise.all([questionariesApi.list(), patientsApi.links(patient.id)]);
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
        (l) => l.questionnaryId === questionaryId && (l.type === 'question' || l.type === 1),
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
        (l) => l.questionnaryId === questionaryId && (l.type === 'question' || l.type === 1),
      );
      if (newLink) {
        try {
          const token = await getToken();
          await sendEmail(newLink.urlId, token);
          toast.success('Link criado e e-mail enviado!');
        } catch (err) {
          toast.warn(`Link criado, mas o e-mail nao foi enviado. ${getErrorMessage(err, 'Falha ao enviar e-mail')}`);
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
      <div className="flex w-full flex-wrap gap-2.5 lg:w-auto">
        <Button
          onClick={openQuestionLinks}
          variant="outline"
          small
          icon="send"
          className="w-full sm:w-auto"
        >
          Enviar Questionario
        </Button>
        <Button
          onClick={openDiaryLinks}
          variant="outline"
          small
          icon="book"
          className="w-full sm:w-auto"
        >
          Enviar Diario
        </Button>
      </div>

      {questionLinksModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center py-6">
            <div className="modal-scrollbar relative max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-scroll rounded-2xl border border-edge-medium bg-surface-panel p-6 shadow-2xl">
              <LoadingOverlay visible={submitting} label="Processando..." />
              <h2 className="mb-4 text-xl font-semibold">Enviar Questionario</h2>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-start justify-center py-6">
            <div className="modal-scrollbar relative max-h-[calc(100vh-3rem)] w-full max-w-lg overflow-y-scroll rounded-2xl border border-edge-medium bg-surface-panel p-6 shadow-2xl">
              <LoadingOverlay visible={submitting} label="Processando..." />
              <h2 className="mb-4 text-xl font-semibold">Enviar Diario</h2>
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
