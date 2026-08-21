"use client";

import { useEffect, useState } from 'react';
import { useParams } from "next/navigation";
import { answersApi } from './pyApi';
import type { PatientLink } from './types';
import QuestionaryAnswer from './QuestionaryAnswer';
import DiaryAnswer from './DiaryAnswer';

export default function AnswerPage() {
  const { urlId } = useParams<{ urlId: string }>();
  const [patientLink, setPatientLink] = useState<PatientLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!urlId) return;
    setLoading(true);
    setLoadError(null);
    answersApi
      .getPatientLink(urlId)
      .then((data) => {
        setPatientLink(data);
      })
      .catch((error) => {
        console.error('Error fetching patient link:', error);
        setLoadError('Não foi possível carregar este link.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [urlId]);

  const type: unknown = patientLink?.type;
  const isQuestionary = type === 'question' || type === 1;
  const isDiary = type === 'diary' || type === 2;

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-base p-6 text-ink-secondary">Carregando...</main>
    );
  }

  if (loadError) {
    return <main className="min-h-screen bg-surface-base p-6 text-danger">{loadError}</main>;
  }

  return (
    <div className="min-h-screen bg-surface-base">
      {isQuestionary && <QuestionaryAnswer patientLink={patientLink} />}
      {isDiary && <DiaryAnswer patientLink={patientLink} />}
      {!isQuestionary && !isDiary && (
        <main className="min-h-screen p-6 text-ink-secondary">Tipo de link não reconhecido.</main>
      )}
    </div>
  );
}
