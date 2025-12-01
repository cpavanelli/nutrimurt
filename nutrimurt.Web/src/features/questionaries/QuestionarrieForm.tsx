import { useState } from 'react';
import type { Questionary, QuestionaryInput } from './types';
interface Props {
    initial?: Questionary | null;
    onSubmit(payload: QuestionaryInput): void;
    onCancel(): void;
    submitting?: boolean;
}

const empty: QuestionaryInput = {
    name: '',
    questions: []
};

export default function QuestionaryForm({ initial, onSubmit, onCancel, submitting }: Props) {
    const QUESTION_TYPE_LABELS: Record<number, string> = {
        1: 'Texto',
        2: 'Sim/Não',
        3: 'Multipla escolha',
    };

    const [form, setForm] = useState<QuestionaryInput>(initial ? {
        name: initial.name,
        questions: initial.questions
    } : empty);

    const [newQuestionText, setNewQuestionText] = useState('');
    const [newQuestionType, setNewQuestionType] = useState(1);
    const [newQuestionAlternativeText, setNewQuestionAlternativeText] = useState('');
    const [newAlternatives, setNewAlternatives] = useState<string[]>([]);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        console.log('Submitting form:', form);
        onSubmit(form);
    }

    function handleAddQuestion() {
        const text = newQuestionText.trim();
        if (!text) return;

        setForm((prev) => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    id: 0,
                    questionText: text,
                    questionType: Number(newQuestionType),
                    createdAt: new Date().toISOString(),
                    alternatives: newQuestionType === 3 ? newAlternatives.map((a) => ({ alternative: a })) : []
                },
            ],
        }));
        setNewQuestionText('');
        setNewQuestionType(1);
        setNewAlternatives([]);
    }

    function handleRemoveQuestion(index: number) {
        setForm((prev) => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index),
        }));
    }



    function handleQuestionTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
        const value = Number(event.target.value);
        if (value !== 3) setNewAlternatives([]); // clear when leaving multiple-choice
        setNewQuestionType(value);
    }

    function handleAddQuestionAlternative() {
        const text = newQuestionAlternativeText.trim();
        if (!text) return;
        setNewAlternatives((prev) => [...prev, text]);
        setNewQuestionAlternativeText('');
    }

    function handleRemoveQuestionAlternative(index: number) {
        setNewAlternatives((prev) => prev.filter((_, i) => i !== index));
    }


    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            <div>
                <label className="block text-sm font-medium text-slate-200">Nome do Questionário</label>
                <input
                    type="text"
                    name="name"
                    value={form.name ?? ''}
                    onChange={handleChange}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-200">
                    Perguntas
                </label>
                <div className="mt-2 flex flex-col gap-3">
                    <div className="mt-2 flex gap-2">
                        <input
                            type="text"
                            value={newQuestionText}
                            onChange={(event) => setNewQuestionText(event.target.value)}
                            placeholder="Digite a pergunta"
                            className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                        />
                        <select
                            value={newQuestionType}
                            onChange={(event) => handleQuestionTypeChange(event)}
                            className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>

                    </div>
                    {newQuestionType === 3 && (
                        <div className="w-full rounded border border-slate-800 bg-slate-900 p-3">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newQuestionAlternativeText}
                                    onChange={(event) => setNewQuestionAlternativeText(event.target.value)}
                                    placeholder="Digite a alternativa"
                                    className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddQuestionAlternative}
                                    className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                                >
                                    +
                                </button>
                            </div>
                            {newAlternatives.length > 0 &&
                                (
                                    <li className="mt-2 text-sm text-slate-200 list-none">Alternativas:</li>
                                )}
                            <ul className="mt-3 flex gap-1 list-none pl-0 justify-center  rounded border border-slate-800">
                                {newAlternatives.map((alt, index) => (
                                    <li key={`${alt}-${index}`} className="text-sm text-slate-200"><span> {alt}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveQuestionAlternative(index)}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            ×
                                        </button>
                                    </li>

                                ))}
                            </ul>
                        </div>
                    )}
                     <div className="mt-2 flex flex-col gap-3"> 
                        <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="rounded bg-emerald-500 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                        >
                        Adicionar Pergunta
                        </button>
                    </div>
                </div>

                <ul className="mt-3 space-y-2">
                    {form.questions.map((question, index) => (
                        <li
                            key={`${question.questionText}-${index}`}
                            className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-3 py-2 text-sm"
                        >
                            <span className="text-slate-200 flex-[2]">{question.questionText}</span>
                            <span className="text-slate-200 basis-[10%] flex-none">{QUESTION_TYPE_LABELS[question.questionType] ?? question.questionType}</span>
                            <button
                                type="button"
                                onClick={() => handleRemoveQuestion(index)}
                                className="text-red-400 hover:text-red-300 basis-[10%] flex-none"
                            >
                                ×
                            </button>
                        </li>
                    ))}
                    {form.questions.length === 0 && (
                        <li className="text-sm text-slate-400">
                            Nenhuma pergunta adicionada ainda.
                        </li>
                    )}
                </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
                >
                    {submitting ? 'Saving...' : 'Save'}
                </button>
            </div>
        </form>
    );
}
