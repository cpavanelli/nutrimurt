import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { answersApi } from './pyApi';
import type { PatientLink, PatientLinkInput } from './types';
import { toast } from 'react-toastify';




export default function AnswerPage() {
    const { urlid } = useParams<{ urlid: string }>();
    const [patientLink, setPatientLink] = useState<PatientLink | null>(null);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientLink) return;
        try {
            await answersApi.save(patientLink);
            setStatus('success');
            toast.success('Respostas enviadas com sucesso');
            // success feedback
        } catch (err) {
            console.error('Error saving answers', err);
            toast.error('Falha ao enviar respostas. Tente novamente.');
            // error feedback
        }
    };

    const handleTextAnswerChange = (questionId: number, value: string) => {
        setPatientLink((prev) => {
            if (!prev) return prev;

            return {
                ...prev,
                questionnary: {
                    ...prev.questionnary,
                    questions: prev.questionnary.questions.map((q) =>
                        q.id === questionId
                            ? { ...q, answer: { ...(q.answer ?? { id: 0, answer: '' }), answer: value } }
                            : q)
                },
            };
        });
    }

    const handleCheckboxAnswerChange = (questionId: number, value: string, checked: boolean) => {
        setPatientLink((prev) => {
            if (!prev) return prev;

            return {
                ...prev,
                questionnary: {
                    ...prev.questionnary,
                    questions: prev.questionnary.questions.map((q) => {
                        if (q.id !== questionId)
                            return q;

                        const prevAlternatives = q.answerAlternatives ?? [];

                        const updatedAlternatives = checked ?
                            [...prevAlternatives, value]
                            : prevAlternatives.filter((v) => v != value)

                        return {...q, answerAlternatives: updatedAlternatives};
                    })
                },
            };
        });
    }

    // 'd9c4a647343c735c46af42f7d9aa5f10'
    useEffect(() => {
        if (!urlid) return;
        answersApi.get(urlid).then((data) => {
            setPatientLink(data);
        }).catch((error) => {
            console.error('Error fetching patient link:', error);
        });
    }, []);

    return (

        <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
                <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 lg:px-10">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Nutrimurt</p>
                            <h1 className="text-2xl font-semibold text-white"></h1>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <a
                                href="#features"
                                className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-300/60 hover:text-white"
                            >
                                X
                            </a>
                        </div>
                    </header>
                    <section className="space-y-6 relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
                        {!patientLink?.questionnary && (<p className="text-slate-400">Carregando questionário...</p>)}
                        {patientLink?.questionnary && (
                            <>
                                <header className="mb-6 border-b border-white/10 pb-4">
                                    <h1 className="text-3xl font-semibold text-white">{patientLink.questionnary?.name}</h1>
                                </header>
                                {patientLink.questionnary.questions.map((question) => (
                                    <section key={question.id} className="space-y-2">
                                        <h2 className="text-slate-100 font-semibold uppercase tracking-wide" >{question.questionText}</h2>
                                        {question.questionType === 1 && (<div className="flex flex-col gap-2 text-sm text-slate-300">
                                            <input type='text' className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white w-full"
                                                value={question.answer?.answer ?? ''}
                                                placeholder="Digite sua resposta aqui" onChange={(e) => handleTextAnswerChange(question.id, e.target.value)} />
                                        </div>)}
                                        {question.questionType === 2 && (<div className="flex flex-wrap gap-2 text-sm text-slate-300">
                                            <input type='radio' checked={question.answer?.answer === 'Y'} name={`question-${question.id}`} value="Y" onChange={(e) => handleTextAnswerChange(question.id, e.target.value)} /> Sim
                                            <input type='radio' checked={question.answer?.answer === 'N'} name={`question-${question.id}`} value="N" onChange={(e) => handleTextAnswerChange(question.id, e.target.value)} /> Não
                                        </div>)}
                                        {question.questionType === 3 && (<div className="flex flex-wrap gap-2 text-sm text-slate-300">
                                            {question.alternatives?.map((alt) => (
                                                <label key={alt.id} className="inline-flex items-center gap-1">
                                                    <input type="checkbox"  name={`question-${question.id}-alt-${alt.id}`} 
                                                    checked={(question.answerAlternatives ?? []).includes(alt.alternative)} 
                                                    value={alt.alternative} onChange={(e) => handleCheckboxAnswerChange(question.id, e.target.value, e.target.checked )}/>
                                                    {alt.alternative}
                                                </label>
                                            ))}

                                        </div>)}


                                    </section>
                                ))}
                            </>

                        )}
                    </section>
                    <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="rounded bg-emerald-500 px-4 py-2 text-white hover:bg-emerald-600"
                    >
                          {status === 'submitting' ? 'Enviando...' : 'Enviar respostas'}
                    </button>
                </div>
            </form>
        </main>
    );
}
