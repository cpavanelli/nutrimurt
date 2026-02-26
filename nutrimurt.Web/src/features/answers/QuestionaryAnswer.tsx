import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { answersApi } from './pyApi';
import type { PatientLink } from './types';

interface Props {
  patientLink: PatientLink | null;
}

export default function QuestionaryAnswer({ patientLink }: Props) {
  const [formPatientLink, setFormPatientLink] = useState<PatientLink | null>(patientLink);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    setFormPatientLink(patientLink);
  }, [patientLink]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formPatientLink) return;
    try {
      setStatus('submitting');
      await answersApi.save(formPatientLink);
      setStatus('success');
      toast.success('Respostas enviadas com sucesso');
    } catch (err) {
      setStatus('error');
      console.error('Error saving answers', err);
      toast.error('Falha ao enviar respostas. Tente novamente.');
    }
  };

  const onTextAnswerChange = (questionId: number, value: string) => {
    setFormPatientLink((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        questionnary: {
          ...prev.questionnary,
          questions: prev.questionnary.questions.map((q) =>
            q.id === questionId
              ? { ...q, answer: { ...(q.answer ?? { id: 0, answer: '' }), answer: value } }
              : q),
        },
      };
    });
  };

  const onCheckboxAnswerChange = (questionId: number, value: string, checked: boolean) => {
    setFormPatientLink((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        questionnary: {
          ...prev.questionnary,
          questions: prev.questionnary.questions.map((q) => {
            if (q.id !== questionId) {
              return q;
            }

            const prevAlternatives = q.answerAlternatives ?? [];
            const updatedAlternatives = checked
              ? [...prevAlternatives, value]
              : prevAlternatives.filter((v) => v !== value);

            return { ...q, answerAlternatives: updatedAlternatives };
          }),
        },
      };
    });
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 lg:px-10">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Nutrimurt</p>
              <h1 className="text-2xl font-semibold text-white"></h1>
            </div>
          </header>
          <section className="space-y-6 relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
            {!formPatientLink?.questionnary && <p className="text-slate-400">Carregando question�rio...</p>}
            {formPatientLink?.questionnary && (
              <>
                <header className="mb-6 border-b border-white/10 pb-4">
                  <h1 className="text-3xl font-semibold text-white">{formPatientLink.questionnary?.name}</h1>
                </header>
                {formPatientLink.questionnary.questions.map((question) => (
                  <section key={question.id} className="space-y-2">
                    <h2 className="text-slate-100 font-semibold uppercase tracking-wide">{question.questionText}</h2>
                    {question.questionType === 1 && (
                      <div className="flex flex-col gap-2 text-sm text-slate-300">
                        <input
                          type="text"
                          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white w-full"
                          value={question.answer?.answer ?? ''}
                          placeholder="Digite sua resposta aqui"
                          onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
                        />
                      </div>
                    )}
                    {question.questionType === 2 && (
                      <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                        <input
                          type="radio"
                          checked={question.answer?.answer === 'Y'}
                          name={`question-${question.id}`}
                          value="Y"
                          onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
                        />{' '}
                        Sim
                        <input
                          type="radio"
                          checked={question.answer?.answer === 'N'}
                          name={`question-${question.id}`}
                          value="N"
                          onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
                        />{' '}
                        Não
                      </div>
                    )}
                    {question.questionType === 3 && (
                      <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                        {question.alternatives?.map((alt) => (
                          <label key={alt.id} className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              name={`question-${question.id}-alt-${alt.id}`}
                              checked={(question.answerAlternatives ?? []).includes(alt.alternative)}
                              value={alt.alternative}
                              onChange={(e) => onCheckboxAnswerChange(question.id, e.target.value, e.target.checked)}
                            />
                            {alt.alternative}
                          </label>
                        ))}
                      </div>
                    )}
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
