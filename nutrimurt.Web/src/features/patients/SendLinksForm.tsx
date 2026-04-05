import { useState } from "react";
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
    onDeleteLink(link: PatientLink): void | Promise<void>;
    onCancel(): void;
    submitting?: boolean;
    errors?: Record<string, string[]>;
}

export default function SendLinksForm({
    patient,
    links,
    mode,
    questionaries,
    onSubmit,
    onSendEmail,
    onDeleteLink,
    onCancel,
    submitting,
}: Props) {
    const appOrigin = window.location.origin;
    const [selectedQuestionaryId, setSelectedQuestionaryId] = useState<number | ''>('');
    const [diaryName, setDiaryName] = useState<string>('Diário Alimentar de ' + patient.name);
    const isQuestionMode = mode === 'question';

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (isQuestionMode && !selectedQuestionaryId) return;
        if (!isQuestionMode && !diaryName.trim()) return;

        if (!isQuestionMode) {
            onSubmit({ type: 'diary', diaryName: diaryName.trim() });
            return;
        }

        onSubmit({ type: 'question', questionaryId: Number(selectedQuestionaryId) });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-200">Paciente</label>
                <p className="mt-1 text-sm text-slate-400">{patient.name}</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-200">
                    {isQuestionMode ? 'Selecionar questionário:' : 'Nome do diário:'}
                </label>

                <div className="mt-2">
                    {isQuestionMode && (
                        <div className="flex w-full gap-2">
                            <select
                                value={selectedQuestionaryId}
                                onChange={e => setSelectedQuestionaryId(Number(e.target.value))}
                                className="block w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
                            >
                                <option value="">Selecione</option>
                                {questionaries.map(q => (
                                    <option key={q.id} value={q.id}>{q.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                                onClick={handleSubmit}
                                disabled={!selectedQuestionaryId || submitting}
                            >
                                +
                            </button>
                        </div>
                    )}

                    {!isQuestionMode && (
                        <div className="flex w-full gap-2">
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
                                onClick={handleSubmit}
                                disabled={!diaryName || submitting}
                            >
                                +
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-200 py-1">
                    {isQuestionMode ? 'Questionários enviados:' : 'Diários enviados:'}
                </label>
                <div className="space-y-4 px-0">
                    {links.map(link => (
                        <div key={link.id} className="p-4 border border-slate-700 rounded-lg bg-slate-800">
                            {isQuestionMode && <p className="text-sm text-slate-400">Questionário: {link.questionnaryName}</p>}
                            {!isQuestionMode && <p className="text-sm text-slate-400">Diário: {link.diaryName ?? '-'}</p>}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="text-blue-400 hover:underline focus:outline-none"
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
                                    className="text-emerald-400 hover:underline focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => onSendEmail(link)}
                                    aria-label="Enviar por email"
                                    disabled={submitting}
                                >
                                    Enviar por email
                                </button>
                                <button
                                    type="button"
                                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded border border-rose-500/60 bg-rose-500/10 text-sm font-bold text-rose-400 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                                    onClick={() => onDeleteLink(link)}
                                    aria-label="Excluir link"
                                    disabled={submitting}
                                >
                                    X
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button
                type="button"
                onClick={onCancel}
                className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
                Cancel
            </button>
        </form>
    );
}
