import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { answersApi } from './pyApi';
import type { PatientLink } from './types';
import QuestionaryAnswer from './QuestionaryAnswer';
import DiaryAnswer from './DiaryAnswer';

export default function AnswerPage() {
    const { urlid } = useParams<{ urlid: string }>();
    const [patientLink, setPatientLink] = useState<PatientLink | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!urlid) return;
        setLoading(true);
        setLoadError(null);
        answersApi.get(urlid).then((data) => {
            setPatientLink(data);
        }).catch((error) => {
            console.error('Error fetching patient link:', error);
            setLoadError('Não foi possível carregar este link.');
        }).finally(() => {
            setLoading(false);
        });
    }, [urlid]);

    const type = (patientLink as any)?.type;
    const isQuestionary = type === 'question' || type === 1;
    const isDiary = type === 'diary' || type === 2;

    if (loading) {
        return <main className="min-h-screen bg-slate-950 p-6 text-slate-300">Carregando...</main>;
    }

    if (loadError) {
        return <main className="min-h-screen bg-slate-950 p-6 text-red-300">{loadError}</main>;
    }

    return (
        <div>
            {isQuestionary && <QuestionaryAnswer patientLink={patientLink} />}

            {isDiary && <DiaryAnswer patientLink={patientLink} />}

            {!isQuestionary && !isDiary && (
                <main className="min-h-screen bg-slate-950 p-6 text-slate-300">
                    Tipo de link não reconhecido.
                </main>
            )}

        </div>
    );
}
