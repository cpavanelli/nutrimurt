import { useMemo, useState } from "react";
import type { Patient, PatientLink, SendLinksInput } from "./types";
import type { Questionary } from '../questionaries/types';
import { copyOrShareLink } from './linkShare';
import { toast } from 'react-toastify';

interface Props {
    patient: Patient;
    links: PatientLink[];
    mode: 'question' | 'diary';
    questionaries: Questionary[];
    onSubmit(payload: SendLinksInput): void | Promise<void>;
    onSendEmail(link: PatientLink): void | Promise<void>;
    onCancel(): void;
    // Question-mode callbacks (create-then-act)
    onCreateAndCopy?(questionaryId: number): void | Promise<void>;
    onCreateAndEmail?(questionaryId: number): void | Promise<void>;
    onCopyLink?(link: PatientLink): void | Promise<void>;
    busyQuestionaryId?: number | null;
    submitting?: boolean;
    errors?: Record<string, string[]>;
}

const btnAction =
    'rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50';
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
    const [diaryName, setDiaryName] = useState<string>('Diário Alimentar de ' + patient.name);
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
                <label className="block text-sm font-medium text-slate-200">Paciente</label>
                <p className="mt-1 text-sm text-slate-400">{patient.name}</p>
            </div>

            {isQuestionMode && (
                <div>
                    <label className="block text-sm font-medium text-slate-200 pb-2">
                        Questionários disponíveis:
                    </label>

                    {questionaries.length === 0 && (
                        <p className="text-sm text-slate-500">Nenhum questionário disponível.</p>
                    )}

                    <div className="space-y-3">
                        {questionaries.map(q => {
                            const existingLink = linkByQuestionaryId.get(q.id);
                            const isBusy = busyQuestionaryId === q.id;

                            return (
                                <div key={q.id} className="p-4 border border-slate-700 rounded-lg bg-slate-800">
                                    <p className="text-sm text-slate-200 font-medium mb-2">{q.name}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            className={btnAction}
                                            disabled={isBusy || submitting}
                                            onClick={() => {
                                                if (existingLink) {
                                                    onCopyLink?.(existingLink);
                                                } else {
                                                    onCreateAndCopy?.(q.id);
                                                }
                                            }}
                                        >
                                            Copiar Link
                                        </button>
                                        <button
                                            type="button"
                                            className={btnAction}
                                            disabled={isBusy || submitting}
                                            onClick={() => {
                                                if (existingLink) {
                                                    onSendEmail(existingLink);
                                                } else {
                                                    onCreateAndEmail?.(q.id);
                                                }
                                            }}
                                        >
                                            Enviar Email
                                        </button>
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
                        <label className="block text-sm font-medium text-slate-200">
                            Nome do diário:
                        </label>
                        <div className="mt-2 flex w-full gap-2">
                            <input
                                type="text"
                                value={diaryName}
                                onChange={e => setDiaryName(e.target.value)}
                                placeholder="Nome do diário"
                                className="block w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
                            />
                            <button
                                type="button"
                                className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                                onClick={handleDiarySubmit}
                                disabled={!diaryName || submitting}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-200 py-1">
                            Diários enviados:
                        </label>
                        <div className="space-y-4 px-0">
                            {links.map(link => (
                                <div key={link.id} className="p-4 border border-slate-700 rounded-lg bg-slate-800">
                                    <p className="text-sm text-slate-400">Diário: {link.diaryName ?? '-'}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            className={btnAction}
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
                                        </button>
                                        <button
                                            type="button"
                                            className={btnAction}
                                            onClick={() => onSendEmail(link)}
                                            aria-label="Enviar por email"
                                            disabled={submitting}
                                        >
                                            Enviar Email
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            <button
                type="button"
                onClick={onCancel}
                className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
                Cancelar
            </button>
        </form>
    );
}
