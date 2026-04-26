import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'react-toastify';
import { answersApi } from './pyApi';
import type { PatientLink } from './types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';

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
              : q
          ),
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
            if (q.id !== questionId) return q;
            const prevAlternatives = q.answerAlternatives ?? [];
            const updated = checked
              ? [...prevAlternatives, value]
              : prevAlternatives.filter((v) => v !== value);
            return { ...q, answerAlternatives: updated };
          }),
        },
      };
    });
  };

  if (status === 'success') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-base px-6 text-ink-primary">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-accent-dim text-accent">
            <Icon name="check" size={28} strokeWidth={2.4} />
          </div>
          <div className="text-xl font-semibold">Respostas Enviadas!</div>
          <div className="text-sm text-ink-secondary">Obrigado por responder o questionário.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-base px-6 py-10 text-ink-primary">
      <form onSubmit={onSubmit} className="mx-auto max-w-[640px]">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent-text">
          NUTRIMURT
        </div>
        <Card>
          {!formPatientLink?.questionnary && (
            <p className="text-ink-secondary">Carregando questionário...</p>
          )}
          {formPatientLink?.questionnary && (
            <>
              <h1 className="mb-5 border-b border-edge-soft pb-5 text-[22px] font-bold">
                {formPatientLink.questionnary?.name}
              </h1>
              <div className="flex flex-col gap-6">
                {formPatientLink.questionnary.questions.map((question, i) => (
                  <div key={question.id}>
                    <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">
                      Pergunta {i + 1}: {question.questionText}
                    </div>
                    {question.questionType === 1 && (
                      <input
                        type="text"
                        className="w-full rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-2.5 text-sm text-ink-primary outline-none transition focus:border-accent-mid"
                        value={question.answer?.answer ?? ''}
                        placeholder="Digite sua resposta"
                        onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
                      />
                    )}
                    {question.questionType === 2 && (
                      <div className="flex gap-5 text-sm">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            checked={question.answer?.answer === 'Y'}
                            name={`question-${question.id}`}
                            value="Y"
                            onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
                            className="h-4 w-4 accent-accent"
                          />
                          Sim
                        </label>
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            checked={question.answer?.answer === 'N'}
                            name={`question-${question.id}`}
                            value="N"
                            onChange={(e) => onTextAnswerChange(question.id, e.target.value)}
                            className="h-4 w-4 accent-accent"
                          />
                          Não
                        </label>
                      </div>
                    )}
                    {question.questionType === 3 && (
                      <div className="flex flex-wrap gap-5 text-sm">
                        {question.alternatives?.map((alt) => (
                          <label key={alt.id} className="flex cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={(question.answerAlternatives ?? []).includes(alt.alternative)}
                              value={alt.alternative}
                              onChange={(e) =>
                                onCheckboxAnswerChange(question.id, e.target.value, e.target.checked)
                              }
                              className="h-4 w-4 accent-accent"
                            />
                            {alt.alternative}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="submit"
                disabled={status === 'submitting'}
                className="mt-7 w-full py-3.5 text-[15px] font-semibold"
              >
                {status === 'submitting' ? 'Enviando...' : 'Enviar Respostas'}
              </Button>
            </>
          )}
        </Card>
      </form>
    </main>
  );
}
