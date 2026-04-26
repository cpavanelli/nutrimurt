import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Card from '../../components/ui/Card';
import Avatar from '../../components/ui/Avatar';
import Tag from '../../components/ui/Tag';
import { Icon } from '../../components/ui/Icon';
import SendLinkModals from '../answers/SendLinkModals';
import { usePatientsApi } from './api';
import { copyOrShareLink } from './linkShare';
import type { PatientLink, PatientWithLinks } from './types';

type HistoryRowOptions = {
  emptyTitle: string;
  title: string;
};

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
      link.type === 'diary' || link.type === 2 ? link.diaryName ?? 'este diario' : link.questionnaryName;

    if (!window.confirm(`Excluir o link "${itemName}"?`)) return;
    if (!patient) return;

    try {
      setDeleting(link.id);
      await patientsApi.deleteLink(patient.id, link.id);
      const refreshedLinks = await patientsApi.links(patient.id);
      syncLinks(refreshedLinks);
      toast.success('Link excluido com sucesso');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Falha ao excluir link');
    } finally {
      setDeleting(null);
    }
  }

  async function handleCopyLink(urlId: string) {
    try {
      const result = await copyOrShareLink(`${appOrigin}/answer/${urlId}`);
      if (result === 'copied') {
        toast.success('Link copiado!');
      }
    } catch (err) {
      console.error('Copy failed', err);
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

  function renderHistoryRow(link: PatientLink, options: HistoryRowOptions) {
    const answered = Boolean(link.lastAnswered);

    return (
      <div
        key={link.id}
        className="flex flex-col gap-4 rounded-[10px] border border-edge-soft bg-surface-elevated px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-ink-primary">{options.title || options.emptyTitle}</p>
            <Tag answered={answered} />
          </div>
          <p className="text-xs text-ink-tertiary">
            {answered ? link.lastAnswered : 'Aguardando resposta'}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          <Link
            to={`/viewAnswer/${link.urlId}`}
            className="inline-flex items-center justify-center rounded-lg border border-accent-mid px-3 py-1.5 text-[13px] font-medium text-accent-text transition hover:bg-accent-dim"
          >
            Ver
          </Link>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-edge-soft px-3 py-1.5 text-[13px] font-medium text-ink-secondary transition hover:bg-surface-card"
            onClick={() => handleCopyLink(link.urlId)}
            aria-label="Copiar link"
          >
            Copiar Link
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-danger-mid px-3 py-1.5 text-[13px] font-medium text-danger transition hover:bg-danger-dim disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => handleDeleteLink(link)}
            disabled={deleting === link.id}
          >
            Excluir
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8">
        <p className="text-sm text-ink-secondary">Carregando resumo do paciente...</p>
      </div>
    );
  }

  const infoItems = [
    { label: 'Telefone', value: patient.phone || '-' },
    { label: 'CPF', value: patient.cpf || '-' },
    { label: 'Nascimento', value: patient.birth || '-' },
    { label: 'Peso', value: patient.weight ? `${patient.weight} kg` : '-' },
    { label: 'Altura', value: patient.height ? `${patient.height} cm` : '-' },
  ];

  return (
    <div className="flex-1 overflow-auto p-4 md:p-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-ink-secondary transition hover:text-ink-primary"
          >
            <Icon name="arrowLeft" size={16} />
            Voltar
          </Link>
        </div>

        <Card className="p-5 md:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar name={patient.name} size="lg" />
              <div className="min-w-0">
                <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                  Resumo do paciente
                </div>
                <h1 className="truncate text-[22px] font-semibold text-ink-primary">{patient.name}</h1>
                <p className="truncate text-sm text-ink-secondary">{patient.email}</p>
              </div>
            </div>

            <div className="w-full shrink-0 lg:w-auto">
              <SendLinkModals
                patient={patient}
                questionLinks={questionLinks}
                diaryLinks={diaryLinks}
                onLinksUpdated={syncLinks}
              />
            </div>
          </div>

          <div className="grid gap-4 border-t border-edge-soft pt-5 sm:grid-cols-2 lg:grid-cols-3">
            {infoItems.map((item) => (
              <div key={item.label}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                  {item.label}
                </div>
                <div className="text-sm font-medium text-ink-primary">{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
              Questionarios Enviados
            </div>

            <div className="flex flex-col gap-3">
              {questionLinks.length === 0 ? (
                <p className="py-6 text-sm text-ink-tertiary">Nenhum questionario enviado.</p>
              ) : (
                questionLinks.map((link) =>
                  renderHistoryRow(link, {
                    title: link.questionnaryName,
                    emptyTitle: 'Questionario sem nome',
                  }),
                )
              )}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
              Diarios Alimentares
            </div>

            <div className="flex flex-col gap-3">
              {diaryLinks.length === 0 ? (
                <p className="py-6 text-sm text-ink-tertiary">Nenhum diario enviado.</p>
              ) : (
                diaryLinks.map((link) =>
                  renderHistoryRow(link, {
                    title: link.diaryName ?? '',
                    emptyTitle: 'Diario sem nome',
                  }),
                )
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
