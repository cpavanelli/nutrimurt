import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { answersApi } from './pyApi';
import type { PatientLink, DiaryEntry, DiaryDayInput } from './types';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from './types';

interface Props {
  patientLink: PatientLink | null;
  readOnly?: boolean;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function sortDays(days: DiaryDayInput[]): DiaryDayInput[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date));
}

function sortEntries(entries: DiaryDayInput['entries']): DiaryDayInput['entries'] {
  return [...entries].sort((a, b) => {
    const mt = a.mealType - b.mealType;
    if (mt !== 0) return mt;
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });
}

function groupByMealType(entries: DiaryDayInput['entries']) {
  const groups: { mealType: number; entries: DiaryDayInput['entries'] }[] = [];
  for (const mt of MEAL_TYPES) {
    const matching = entries.filter((e) => e.mealType === mt);
    if (matching.length > 0) {
      groups.push({ mealType: mt, entries: matching });
    }
  }
  return groups;
}

export default function DiaryAnswer({ patientLink, readOnly = false }: Props) {
  const navigate = useNavigate();
  const [formPatientLink, setFormPatientLink] = useState<PatientLink | null>(patientLink);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [days, setDays] = useState<DiaryDayInput[]>([]);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const maxDays = 3;
  const canAddNewDay = days.length < maxDays;
  const currentDay = days[currentDayIndex] ?? null;
  const totalEntries = days.reduce((total, day) => total + day.entries.length, 0);

  const normalizeTime = (value: string | null | undefined): string | null => {
    if (!value) return null;
    if (value.includes('T')) return value.split('T')[1].slice(0, 5);
    return value.slice(0, 5);
  };

  const addDiaryDay = () => {
    if (readOnly || !canAddNewDay) return;
    let newDayStr: string;
    if (days.length > 0) {
      const sorted = sortDays(days);
      const lastDate = new Date(sorted[sorted.length - 1].date);
      lastDate.setDate(lastDate.getDate() + 1);
      newDayStr = lastDate.toISOString().split('T')[0];
    } else {
      newDayStr = new Date().toISOString().split('T')[0];
    }
    setDays((prev) => {
      const updated = [...prev, { date: newDayStr, entries: [] }];
      return sortDays(updated);
    });
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
        mealType: entry.mealType,
        time: normalizeTime(entry.time),
        food: entry.food,
        amount: entry.amount
      });
    });

    const initialDays = sortDays(
      Object.entries(entriesByDate).map(([date, entries]) => ({
        date,
        entries: sortEntries(entries),
      }))
    );
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

  const [selectedMealType, setSelectedMealType] = useState<number>(1);

  const [entryDraft, setEntryDraft] = useState<Omit<DiaryEntry, 'id'>>({
    date: '',
    mealType: 1,
    time: null,
    food: '',
    amount: ''
  });

  const hasRequiredEntryFields = entryDraft.food && entryDraft.amount;

  const addEntry = () => {
    if (readOnly || !hasRequiredEntryFields || !currentDay) return;
    const newEntry: Omit<DiaryEntry, 'id' | 'patientDiaryId'> = {
      date: currentDay.date,
      mealType: selectedMealType,
      time: null,
      food: entryDraft.food,
      amount: entryDraft.amount
    };

    setDays((prev) =>
      prev.map((day, index) =>
        index === currentDayIndex
          ? { ...day, entries: sortEntries([...day.entries, newEntry]) }
          : day
      )
    );

    setEntryDraft((prev) => ({ ...prev, time: null, food: '', amount: '' }));
  };

  const removeEntry = (dayIndex: number, entryIndex: number) => {
    if (readOnly) return;
    const day = days[dayIndex];
    const sorted = sortEntries(day.entries);
    setDays((prev) =>
      prev.map((d, idx) =>
        idx === dayIndex ? { ...d, entries: sorted.filter((_, eIdx) => eIdx !== entryIndex) } : d
      )
    );
  };

  const toIsoDateTime = (date: string, time: string | null) => {
    if (!date || !time) return null;
    return `${date}T${time}:00`;
  };

  const handleDateChange = (index: number, newDate: string) => {
    const isDuplicate = days.some((d, i) => i !== index && d.date === newDate);
    if (isDuplicate) {
      toast.warn('Já existe um dia com esta data.');
      return;
    }
    setDays((prev) => {
      const updated = prev.map((d, i) =>
        i === index
          ? { ...d, date: newDate, entries: d.entries.map((entry) => ({ ...entry, date: newDate })) }
          : d
      );
      return sortDays(updated);
    });
    // After sorting, find where this day ended up
    const sorted = sortDays(
      days.map((d, i) =>
        i === index ? { ...d, date: newDate } : d
      )
    );
    const newIdx = sorted.findIndex((d) => d.date === newDate);
    setCurrentDayIndex(newIdx >= 0 ? newIdx : 0);
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
          mealType: entry.mealType,
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
                  <span
                    key={`${day.date}-${index}`}
                    className="relative inline-flex items-center rounded-xl border border-emerald-300/40 bg-emerald-500 px-3 py-1 text-sm font-medium text-white"
                  >
                    <button
                      type="button"
                      onClick={() => dateInputRef.current?.showPicker()}
                      className="cursor-pointer bg-transparent text-white"
                    >
                      {formatDate(day.date)}
                    </button>
                    <input
                      ref={dateInputRef}
                      type="date"
                      value={day.date}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                      className="pointer-events-none absolute inset-0 h-0 w-0 overflow-hidden opacity-0"
                      tabIndex={-1}
                    />
                  </span>
                ) : (
                  <button
                    key={`${day.date}-${index}`}
                    type="button"
                    onClick={() => setCurrentDayIndex(index)}
                    className="rounded-xl bg-slate-800/50 px-3 py-1 text-sm font-medium text-slate-300 transition hover:bg-slate-700/50"
                  >
                    {formatDate(day.date)}
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
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-300">Refeicao:</span>
                    {MEAL_TYPES.map((mt) => (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => setSelectedMealType(mt)}
                        className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                          selectedMealType === mt
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        {MEAL_TYPE_LABELS[mt]}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    {/* <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={useTime}
                          onChange={(e) => {
                            setUseTime(e.target.checked);
                            if (e.target.checked) {
                              setEntryDraft((prev) => ({ ...prev, time: timeRightNow() }));
                            } else {
                              setEntryDraft((prev) => ({ ...prev, time: null }));
                            }
                          }}
                          className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        Horario
                      </label>
                      {useTime && (
                        <div className="flex items-center gap-1">
                          <select
                            value={draftHour}
                            onChange={(e) =>
                              setEntryDraft((prev) => ({ ...prev, time: `${e.target.value}:${draftMinute}` }))
                            }
                            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                          >
                            {hourOptions.map((hour) => (
                              <option key={hour} value={hour}>{hour}</option>
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
                              <option key={minute} value={minute}>{minute}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div> */}
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
                {days.map((day, dayIndex) => {
                  const mealGroups = groupByMealType(sortEntries(day.entries));
                  return (
                    <div key={`${day.date}-${dayIndex}`} className="space-y-3">
                      <p className="text-sm font-semibold text-emerald-300">{formatDate(day.date)}</p>
                      {mealGroups.length === 0 ? (
                        <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-500">
                          Sem entradas neste dia.
                        </div>
                      ) : (
                        mealGroups.map((group) => (
                          <div key={group.mealType} className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
                              {MEAL_TYPE_LABELS[group.mealType]}
                            </p>
                            {group.entries.map((entry, entryIndex) => {
                              const globalIndex = day.entries.indexOf(entry);
                              return (
                                <article
                                  key={`${entry.mealType}-${entry.food}-${entryIndex}`}
                                  className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3"
                                >
                                  {entry.time && (
                                    <p className="text-sm text-slate-400">{entry.time}</p>
                                  )}
                                  <h3 className="font-semibold text-emerald-200">{entry.food}</h3>
                                  <p className="text-sm text-slate-400">{entry.amount}</p>
                                  {!readOnly && (
                                    <button
                                      type="button"
                                      onClick={() => removeEntry(dayIndex, globalIndex)}
                                      className="text-xs font-medium text-rose-300 transition hover:text-rose-200"
                                    >
                                      Remover entrada
                                    </button>
                                  )}
                                </article>
                              );
                            })}
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
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
