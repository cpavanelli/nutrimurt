import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { answersApi } from './pyApi';
import type { PatientLink } from './types';
import TopHeader from '../../components/TopHeader';
import DiaryAnswer from './DiaryAnswer';

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
      .then((data) => {
        setPatientLink(data);
      })
      .catch((error) => {
        console.error('Error fetching patient link:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [urlid, getToken]);

  const type = (patientLink as any)?.type;
  const isQuestionary = type === 'question' || type === 1;
  const isDiary = type === 'diary' || type === 2;

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-6 text-slate-300">Carregando...</main>;
  }

  if (isDiary) {
    return <DiaryAnswer patientLink={patientLink} readOnly />;
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 pb-16 pt-10 lg:px-10">
        <TopHeader />
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200"
          >
            Voltar
          </button>
        </div>
        <section className="space-y-6 relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
          {!patientLink?.questionnary && <p className="text-slate-400">Carregando questionario...</p>}
          {isQuestionary && patientLink?.questionnary && (
            <>
              <header className="mb-6 border-b border-white/10 pb-4">
                <h1 className="text-3xl font-semibold text-white">{patientLink.questionnary?.name}</h1>
              </header>
              {patientLink.questionnary.questions.map((question) => (
                <section key={question.id} className="space-y-2">
                  <h2 className="text-slate-100 font-semibold uppercase tracking-wide">{question.questionText}</h2>
                  {question.questionType === 1 && (
                    <div className="flex flex-col gap-2 text-sm text-slate-300">
                      <span>{question.answer?.answer}</span>
                    </div>
                  )}
                  {question.questionType === 2 && (
                    <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                      <span>{question.answer?.answer === 'Y' ? 'Sim' : 'Nao'}</span>
                    </div>
                  )}
                  {question.questionType === 3 && (
                    <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                      {question.alternatives?.map((alt) => {
                        const checked = (question.answerAlternatives ?? []).includes(alt.alternative);
                        return (
                          <label key={alt.id} className="inline-flex items-center gap-1">
                            <span
                              className={[
                                'inline-flex h-5 w-5 items-center justify-center rounded border',
                                checked
                                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                                  : 'border-slate-600 bg-slate-800 text-transparent',
                              ].join(' ')}
                            >
                              x
                            </span>
                            {alt.alternative}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

