import { useState } from "react";
import type { Patient, PatientLink, SendLinksInput } from "./types";
import type { Questionary } from '../questionaries/types';



interface Props {
    patient: Patient;
    links: PatientLink[];
    questionaries: Questionary[];
    onSubmit(payload: SendLinksInput): void | Promise<void>;
    onCancel(): void;
    submitting?: boolean;
    errors?: Record<string, string[]>;
}

export default function SendLinksForm({ patient, links, questionaries, onSubmit, onCancel, submitting }: Props) {
    const appOrigin = window.location.origin;
    const [selectedLinkType, setSelectedLinkType] = useState<number | ''>('');
    const [selectedQuestionaryId, setSelectedQuestionaryId] = useState<number | ''>('');

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        if (!selectedQuestionaryId) return;
        
        onSubmit({ type: 'question', questionaryId: Number(selectedQuestionaryId) });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-200">Paciente</label>
                <p className="mt-1 text-sm text-slate-400">{patient.name}</p>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-200">Enviar novo link:</label>
                <div className="grid  flex-1 gap-6 lg:grid-cols-2 ">
                    <select value={selectedLinkType}
                        onChange={e => {
                            const value = e.target.value;
                            setSelectedLinkType(value ? Number(value) : '');
                            setSelectedQuestionaryId('');
                        }}
                        className="block w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-200"
                    >
                        <option value="0">Selecione</option>
                        <option value="1">Questionário</option>
                        <option value="2">Diário</option>
                    </select>
                    {selectedLinkType === 1 && (
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
                            <button type="button" className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                                onClick={handleSubmit}
                                disabled={!selectedQuestionaryId || submitting}
                            >
                                +
                            </button>
                        </div>
                    )}
                    {selectedLinkType === 2 && (
                        <p className="text-sm text-slate-400">Envio de diários não implementado ainda.</p>
                    )}
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-200 py-1">Links enviados:</label>
                <div className="space-y-4 px-0">
                    {links.map(link => (
                        <div key={link.id} className="p-4 border border-slate-700 rounded-lg bg-slate-800">
                            {link.questionnaryName && link.type === 'question' && (<p className="text-sm text-slate-400">Questionário: {link.questionnaryName}</p>)}
                            {link.questionnaryName && link.type !== 'question' && (<p className="text-sm text-slate-400">Diário</p>)}
                            <div id="divLinks" className="flex items-center gap-2">

                                <button type="button" className="text-blue-400 hover:underline focus:outline-none"
                                    onClick={async () => {
                                        try {
                                            await navigator.clipboard.writeText(`${appOrigin}/answer/${link.urlId}`);
                                        } catch (err) {
                                            console.error("Copy failed", err);
                                        }
                                    }}
                                    aria-label="Copiar link"
                                >
                                    Copiar Link
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