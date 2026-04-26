import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Button from '../../components/ui/Button';
import type { Questionary } from '../questionaries/types';
import { copyOrShareLink } from './linkShare';
import type { Patient, PatientLink, SendLinksInput } from './types';

interface Props {
  patient: Patient;
  links: PatientLink[];
  mode: 'question' | 'diary';
  questionaries: Questionary[];
  onSubmit(payload: SendLinksInput): void | Promise<void>;
  onSendEmail(link: PatientLink): void | Promise<void>;
  onCancel(): void;
  onCreateAndCopy?(questionaryId: number): void | Promise<void>;
  onCreateAndEmail?(questionaryId: number): void | Promise<void>;
  onCopyLink?(link: PatientLink): void | Promise<void>;
  busyQuestionaryId?: number | null;
  submitting?: boolean;
  errors?: Record<string, string[]>;
}

const actionButtonClass =
  'border-accent-mid bg-accent-dim text-accent-text hover:bg-accent-dim/80';

export default function SendLinksForm({
  patient,
  links,
  mode,
  questionaries,
  onSubmit,
  onSendEmail,
  onCancel,
  onCreateAndCopy,
  onCreateAndEmail,
  onCopyLink,
  busyQuestionaryId,
  submitting,
}: Props) {
  const appOrigin = window.location.origin;
  const [diaryName, setDiaryName] = useState(`Diario Alimentar de ${patient.name}`);
  const isQuestionMode = mode === 'question';

  const linkByQuestionaryId = useMemo(() => {
    const map = new Map<number, PatientLink>();
    for (const link of links) {
      if (link.questionnaryId) map.set(link.questionnaryId, link);
    }
    return map;
  }, [links]);

  function handleDiarySubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!diaryName.trim()) return;
    onSubmit({ type: 'diary', diaryName: diaryName.trim() });
  }

  return (
    <form onSubmit={handleDiarySubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink-primary">Paciente</label>
        <p className="mt-1 text-sm text-ink-secondary">{patient.name}</p>
      </div>

      {isQuestionMode && (
        <div>
          <label className="block pb-2 text-sm font-medium text-ink-primary">Questionarios disponiveis:</label>

          {questionaries.length === 0 && (
            <p className="text-sm text-ink-tertiary">Nenhum questionario disponivel.</p>
          )}

          <div className="space-y-3">
            {questionaries.map((questionary) => {
              const existingLink = linkByQuestionaryId.get(questionary.id);
              const isBusy = busyQuestionaryId === questionary.id;

              return (
                <div
                  key={questionary.id}
                  className="rounded-lg border border-edge-soft bg-surface-elevated p-4"
                >
                  <p className="mb-2 text-sm font-medium text-ink-primary">{questionary.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      small
                      variant="outline"
                      className={actionButtonClass}
                      disabled={isBusy || submitting}
                      onClick={() => {
                        if (existingLink) {
                          onCopyLink?.(existingLink);
                        } else {
                          onCreateAndCopy?.(questionary.id);
                        }
                      }}
                    >
                      Copiar Link
                    </Button>
                    <Button
                      type="button"
                      small
                      variant="outline"
                      className={actionButtonClass}
                      disabled={isBusy || submitting}
                      onClick={() => {
                        if (existingLink) {
                          onSendEmail(existingLink);
                        } else {
                          onCreateAndEmail?.(questionary.id);
                        }
                      }}
                    >
                      Enviar Email
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isQuestionMode && (
        <>
          <div>
            <label className="block text-sm font-medium text-ink-primary">Nome do diario:</label>
            <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={diaryName}
                onChange={(e) => setDiaryName(e.target.value)}
                placeholder="Nome do diario"
                className="block w-full rounded-lg border border-edge-soft bg-surface-elevated px-3 py-2 text-ink-primary outline-none transition focus:border-accent-mid"
              />
              <Button
                type="button"
                onClick={handleDiarySubmit}
                disabled={!diaryName || submitting}
                className="justify-center sm:min-w-12"
              >
                +
              </Button>
            </div>
          </div>

          <div>
            <label className="block py-1 text-sm font-medium text-ink-primary">Diarios enviados:</label>
            <div className="space-y-4 px-0">
              {links.map((link) => (
                <div key={link.id} className="rounded-lg border border-edge-soft bg-surface-elevated p-4">
                  <p className="text-sm text-ink-secondary">Diario: {link.diaryName ?? '-'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      small
                      variant="outline"
                      className={actionButtonClass}
                      onClick={async () => {
                        try {
                          const result = await copyOrShareLink(`${appOrigin}/answer/${link.urlId}`);
                          if (result === 'copied') {
                            toast.success('Link copiado!');
                          }
                        } catch (err) {
                          console.error('Copy failed', err);
                        }
                      }}
                      aria-label="Copiar link"
                      disabled={submitting}
                    >
                      Copiar Link
                    </Button>
                    <Button
                      type="button"
                      small
                      variant="outline"
                      className={actionButtonClass}
                      onClick={() => onSendEmail(link)}
                      aria-label="Enviar por email"
                      disabled={submitting}
                    >
                      Enviar Email
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Button type="button" onClick={onCancel} variant="ghost">
        Cancelar
      </Button>
    </form>
  );
}
