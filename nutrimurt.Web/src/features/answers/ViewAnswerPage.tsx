import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { answersApi } from './pyApi';
import type { PatientLink } from './types';
import DiaryAnswer from './DiaryAnswer';
import Card from '../../components/ui/Card';
import { Icon } from '../../components/ui/Icon';

export default function ViewAnswerPage() {
  const { urlid } = useParams<{ urlid: string }>();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [patientLink, setPatientLink] = useState<PatientLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!urlid) return;

    setLoading(true);
    getToken()
      .then((token) => answersApi.getPatientLinkStaff(urlid, token))
      .then((data) => setPatientLink(data))
      .catch((error) => {
        console.error('Error fetching patient link:', error);
      })
      .finally(() => setLoading(false));
  }, [urlid, getToken]);

  const type = (patientLink as any)?.type;
  const isQuestionary = type === 'question' || type === 1;
  const isDiary = type === 'diary' || type === 2;

  if (loading) {
    return <div className="flex-1 p-8 text-ink-secondary">Carregando...</div>;
  }

  if (isDiary) {
    return <DiaryAnswer patientLink={patientLink} readOnly />;
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-ink-secondary transition hover:text-ink-primary"
      >
        <Icon name="arrowLeft" size={16} />
        Voltar
      </button>

      <div className="mx-auto max-w-[640px]">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent-text">
          NUTRIMURT
        </div>
        <Card>
          {!patientLink?.questionnary && (
            <p className="text-ink-secondary">Carregando questionário...</p>
          )}
          {isQuestionary && patientLink?.questionnary && (
            <>
              <h1 className="mb-5 border-b border-edge-soft pb-5 text-[22px] font-bold">
                {patientLink.questionnary?.name}
              </h1>
              <div className="flex flex-col gap-6">
                {patientLink.questionnary.questions.map((question, i) => (
                  <div key={question.id}>
                    <div className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.1em] text-ink-tertiary">
                      Pergunta {i + 1}: {question.questionText}
                    </div>
                    {question.questionType === 1 && (
                      <div className="rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-2.5 text-sm">
                        {question.answer?.answer || '-'}
                      </div>
                    )}
                    {question.questionType === 2 && (
                      <div className="text-sm text-ink-primary">
                        {question.answer?.answer === 'Y' ? 'Sim' : 'Não'}
                      </div>
                    )}
                    {question.questionType === 3 && (
                      <div className="flex flex-wrap gap-3 text-sm">
                        {question.alternatives?.map((alt) => {
                          const checked = (question.answerAlternatives ?? []).includes(
                            alt.alternative
                          );
                          return (
                            <span
                              key={alt.id}
                              className="inline-flex items-center gap-2"
                            >
                              <span
                                className={[
                                  'inline-flex h-5 w-5 items-center justify-center rounded border',
                                  checked
                                    ? 'border-accent bg-accent text-[#0b0f1a]'
                                    : 'border-edge-medium bg-surface-elevated text-transparent',
                                ].join(' ')}
                              >
                                <Icon name="check" size={12} strokeWidth={2.4} />
                              </span>
                              {alt.alternative}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
