import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { answersApi } from './pyApi';
import type { PatientLink, DiaryEntry, DiaryDayInput } from './types';

interface Props {
  patientLink: PatientLink | null;
  readOnly?: boolean;
}

export default function DiaryAnswer({ patientLink, readOnly = false }: Props) {
  const navigate = useNavigate();
  const [formPatientLink, setFormPatientLink] = useState<PatientLink | null>(patientLink);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [days, setDays] = useState<DiaryDayInput[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const maxDays = 3;
  const canAddNewDay = days.length < maxDays;
  const currentDay = days[currentDayIndex] ?? null;
  const totalEntries = days.reduce((total, day) => total + day.entries.length, 0);

  const normalizeTime = (value: string) => {
    if (!value) return '';
    if (value.includes('T')) return value.split('T')[1].slice(0, 5);
    return value.slice(0, 5);
  };

  const addDiaryDay = () => {
    if (readOnly || !canAddNewDay) return;
    const newDayStr = new Date().toISOString().split('T')[0];
    setDays((prev) => [...prev, { date: newDayStr, entries: [] }]);
    setCurrentDayIndex(days.length);
  };

  useEffect(() => {
    setFormPatientLink(patientLink);

    const serverEntries = patientLink?.diary?.entries ?? [];
    const entriesByDate: Record<string, DiaryDayInput['entries']> = {};

    serverEntries.forEach((entry) => {
      const date = entry.date.split('T')[0];
      if (!entriesByDate[date]) {
        entriesByDate[date] = [];
      }
      entriesByDate[date].push({
        date,
        time: normalizeTime(entry.time),
        food: entry.food,
        amount: entry.amount
      });
    });

    const initialDays = Object.entries(entriesByDate).map(([date, entries]) => ({ date, entries }));
    if (initialDays.length > 0) {
      setDays(initialDays.slice(0, maxDays));
    } else if (readOnly) {
      setDays([]);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setDays([{ date: todayStr, entries: [] }]);
    }
    setCurrentDayIndex(0);
  }, [patientLink, readOnly]);

  const timeRightNow = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [entryDraft, setEntryDraft] = useState<Omit<DiaryEntry, 'id'>>({
    date: '',
    time: timeRightNow(),
    food: '',
    amount: ''
  });
  const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  const [draftHour = '00', draftMinute = '00'] = (entryDraft.time || '00:00').split(':');

  const hasRequiredEntryFields = entryDraft.time && entryDraft.food && entryDraft.amount;

  const addEntry = () => {
    if (readOnly || !hasRequiredEntryFields || !currentDay) return;
    const newEntry: Omit<DiaryEntry, 'id' | 'patientDiaryId'> = {
      date: currentDay.date,
      time: entryDraft.time,
      food: entryDraft.food,
      amount: entryDraft.amount
    };

    setDays((prev) =>
      prev.map((day, index) => (index === currentDayIndex ? { ...day, entries: [...day.entries, newEntry] } : day))
    );

    setEntryDraft((prev) => ({ ...prev, time: timeRightNow(), food: '', amount: '' }));
  };

  const removeEntry = (dayIndex: number, entryIndex: number) => {
    if (readOnly) return;
    setDays((prev) =>
      prev.map((day, idx) =>
        idx === dayIndex ? { ...day, entries: day.entries.filter((_, entryIdx) => entryIdx !== entryIndex) } : day
      )
    );
  };

  const toIsoDateTime = (date: string, time: string) => {
    if (!date || !time) return '';
    return `${date}T${time}:00`;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (readOnly || !formPatientLink) return;
    try {
      setStatus('submitting');
      formPatientLink.diary.entries = days.flatMap((day) =>
        day.entries.map((entry) => ({
          id: 0,
          date: day.date,
          time: toIsoDateTime(day.date, entry.time),
          food: entry.food,
          amount: entry.amount,
          patientDiaryId: formPatientLink.diaryId
        }))
      );

      await answersApi.savePatientDiary(formPatientLink);

      setStatus('success');
      toast.success('Diario enviado com sucesso');
    } catch (err) {
      setStatus('error');
      console.error('Error saving answers', err);
      toast.error('Falha ao enviar diario. Tente novamente.');
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 pb-16 pt-10 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Nutrimurt</p>
            <h1 className="text-2xl font-semibold">Diario alimentar</h1>
            <p className="text-sm text-slate-400">
              {patientLink?.diary.name ? `Diario: ${patientLink.diary.name}` : 'Registre cada refeicao do dia.'}
            </p>
          </div>
        </header>
        {readOnly && (
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200"
            >
              Voltar
            </button>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
          {!readOnly && (
            <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
              {days.map((day, index) => (
                index === currentDayIndex ? (
                  <input
                    key={`${day.date}-${index}`}
                    type="date"
                    value={day.date}
                    onChange={(e) =>
                      setDays((prev) =>
                        prev.map((d, i) =>
                          i === index
                            ? {
                              ...d,
                              date: e.target.value,
                              entries: d.entries.map((entry) => ({ ...entry, date: e.target.value }))
                            }
                            : d
                        )
                      )
                    }
                    className="rounded-xl border border-emerald-300/40 bg-emerald-500 px-3 py-1 text-sm font-medium text-white"
                  />
                ) : (
                  <button
                    key={`${day.date}-${index}`}
                    type="button"
                    onClick={() => setCurrentDayIndex(index)}
                    className="rounded-xl bg-slate-800/50 px-3 py-1 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
                  >
                    {day.date}
                  </button>
                )
              ))}

              <button
                type="button"
                onClick={addDiaryDay}
                disabled={!canAddNewDay}
                className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Adicionar dia
              </button>
            </div>
          )}

          <div className="mt-6 space-y-6">
            {!readOnly && (
              <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <h2 className="mb-3 text-lg font-semibold">Adicionar refeicao</h2>
                <div className="flex flex-wrap items-end gap-3">
                  Horario:
                  <div className="flex min-w-[160px] items-center gap-2">
                    <select
                      value={draftHour}
                      onChange={(e) =>
                        setEntryDraft((prev) => ({ ...prev, time: `${e.target.value}:${draftMinute}` }))
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      {hourOptions.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-400">:</span>
                    <select
                      value={draftMinute}
                      onChange={(e) =>
                        setEntryDraft((prev) => ({ ...prev, time: `${draftHour}:${e.target.value}` }))
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      {minuteOptions.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    placeholder="Alimento (ex: Whey)"
                    value={entryDraft.food}
                    onChange={(e) => setEntryDraft((prev) => ({ ...prev, food: e.target.value }))}
                    className="min-w-[220px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  />
                  <input
                    type="text"
                    placeholder="Quantidade (ex: 1 scoop)"
                    value={entryDraft.amount}
                    onChange={(e) => setEntryDraft((prev) => ({ ...prev, amount: e.target.value }))}
                    className="min-w-[180px] flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={addEntry}
                    disabled={!hasRequiredEntryFields}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-900/50"
                  >
                    Adicionar entrada ao dia
                  </button>
                </div>
              </section>
            )}

            <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              {days.length === 0 && (
                <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-500">
                  Sem entradas neste diario.
                </div>
              )}
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}
              >
                {days.map((day, dayIndex) => (
                  <div key={`${day.date}-${dayIndex}`} className="space-y-3">
                    <p className="text-sm font-semibold text-emerald-300">{day.date}</p>
                    {day.entries.length === 0 ? (
                      <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-500">
                        Sem entradas neste dia.
                      </div>
                    ) : (
                      day.entries.map((entry, entryIndex) => (
                        <article key={`${entry.date}-${entry.time}-${entry.food}-${entryIndex}`} className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                          <p className="text-sm text-slate-400">{entry.time}</p>
                          <h3 className="font-semibold text-emerald-200">{entry.food}</h3>
                          <p className="text-sm text-slate-400">{entry.amount}</p>
                          {!readOnly && (
                            <button
                              type="button"
                              onClick={() => removeEntry(dayIndex, entryIndex)}
                              className="text-xs font-medium text-rose-300 transition hover:text-rose-200"
                            >
                              Remover entrada
                            </button>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={totalEntries === 0 || status === 'submitting'}
              className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-900/50"
            >
              {status === 'submitting' ? 'Enviando...' : 'Salvar diario'}
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
