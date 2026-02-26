import { useMemo, useState } from 'react';
import type { PatientLink } from './types';

interface Props {
  patientLink: PatientLink | null;
}

interface DiaryDay {
  id: number;
  date: string;
  entries: DiaryMealEntry[];
}

interface DiaryMealEntry {
  id: number;
  mealLabel: string;
  time: string;
  food: string;
  amount: string;
  notes: string;
}

const MAX_DAYS = 3;

const getTodayDate = () => {
  const today = new Date();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${today.getFullYear()}-${month}-${day}`;
};

const buildEmptyMealEntry = (): Omit<DiaryMealEntry, 'id'> => ({
  mealLabel: '',
  time: '',
  food: '',
  amount: '',
  notes: '',
});

export default function DiaryAnswer({ patientLink }: Props) {
  const [diaryDays, setDiaryDays] = useState<DiaryDay[]>([
    {
      id: Date.now(),
      date: getTodayDate(),
      entries: [],
    },
  ]);
  const [selectedDayId, setSelectedDayId] = useState<number>(diaryDays[0].id);
  const [entryDraft, setEntryDraft] = useState<Omit<DiaryMealEntry, 'id'>>(buildEmptyMealEntry());

  const selectedDay = useMemo(() => diaryDays.find((day) => day.id === selectedDayId) ?? null, [diaryDays, selectedDayId]);

  const canAddNewDay = diaryDays.length < MAX_DAYS;
  const hasRequiredEntryFields = entryDraft.mealLabel.trim() && entryDraft.time && entryDraft.food.trim();

  const addDiaryDay = () => {
    if (!canAddNewDay) return;

    const newDay: DiaryDay = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      date: getTodayDate(),
      entries: [],
    };

    setDiaryDays((prev) => [...prev, newDay]);
    setSelectedDayId(newDay.id);
    setEntryDraft(buildEmptyMealEntry());
  };

  const updateDayDate = (dayId: number, newDate: string) => {
    setDiaryDays((prev) => prev.map((day) => (day.id === dayId ? { ...day, date: newDate } : day)));
  };

  const addEntryToSelectedDay = () => {
    if (!selectedDay || !hasRequiredEntryFields) return;

    const newEntry: DiaryMealEntry = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      ...entryDraft,
      mealLabel: entryDraft.mealLabel.trim(),
      food: entryDraft.food.trim(),
      amount: entryDraft.amount.trim(),
      notes: entryDraft.notes.trim(),
    };

    setDiaryDays((prev) =>
      prev.map((day) =>
        day.id === selectedDay.id
          ? {
              ...day,
              entries: [newEntry, ...day.entries],
            }
          : day,
      ),
    );

    setEntryDraft(buildEmptyMealEntry());
  };

  const removeEntry = (dayId: number, entryId: number) => {
    setDiaryDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? {
              ...day,
              entries: day.entries.filter((entry) => entry.id !== entryId),
            }
          : day,
      ),
    );
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute left-1/2 top-10 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-teal-800/20 blur-3xl" />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 pb-16 pt-10 lg:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Nutrimurt</p>
            <h1 className="text-2xl font-semibold">Diário alimentar</h1>
            <p className="text-sm text-slate-400">
              {patientLink?.questionnaryName ? `Diário: ${patientLink.questionnaryName}` : 'Registre cada refeição do dia.'}
            </p>
          </div>
          <button
            type="button"
            onClick={addDiaryDay}
            disabled={!canAddNewDay}
            className="rounded-xl border border-emerald-300/40 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Adicionar dia ({diaryDays.length}/{MAX_DAYS})
          </button>
        </header>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 via-slate-900/60 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
            {diaryDays.map((day, index) => {
              const isActive = day.id === selectedDayId;
              const buttonText = day.date ? new Date(`${day.date}T00:00:00`).toLocaleDateString('pt-BR') : `Dia ${index + 1}`;

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayId(day.id)}
                  className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100'
                      : 'border-slate-700 bg-slate-900/80 text-slate-200 hover:border-slate-500'
                  }`}
                >
                  Dia {index + 1} • {buttonText}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
              <section className="space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-slate-300" htmlFor="diary-date">
                    Data do dia selecionado
                  </label>
                  <input
                    id="diary-date"
                    type="date"
                    value={selectedDay.date}
                    onChange={(e) => updateDayDate(selectedDay.id, e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                </div>

                <h2 className="text-lg font-semibold">Adicionar refeição</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Momento (ex: Café da manhã)"
                    value={entryDraft.mealLabel}
                    onChange={(e) => setEntryDraft((prev) => ({ ...prev, mealLabel: e.target.value }))}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 sm:col-span-2"
                  />
                  <input
                    type="time"
                    value={entryDraft.time}
                    onChange={(e) => setEntryDraft((prev) => ({ ...prev, time: e.target.value }))}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="text"
                    placeholder="Quantidade (ex: 1 prato)"
                    value={entryDraft.amount}
                    onChange={(e) => setEntryDraft((prev) => ({ ...prev, amount: e.target.value }))}
                    className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  />
                  <textarea
                    placeholder="O que comeu?"
                    value={entryDraft.food}
                    onChange={(e) => setEntryDraft((prev) => ({ ...prev, food: e.target.value }))}
                    className="min-h-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 sm:col-span-2"
                  />
                  <textarea
                    placeholder="Observações opcionais"
                    value={entryDraft.notes}
                    onChange={(e) => setEntryDraft((prev) => ({ ...prev, notes: e.target.value }))}
                    className="min-h-16 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 sm:col-span-2"
                  />
                </div>

                <button
                  type="button"
                  onClick={addEntryToSelectedDay}
                  disabled={!hasRequiredEntryFields}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-900/50"
                >
                  Adicionar entrada ao dia
                </button>
              </section>

              <section className="space-y-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Log do dia</h2>
                  <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                    {selectedDay.entries.length} refeiç{selectedDay.entries.length === 1 ? 'ão' : 'ões'}
                  </span>
                </div>

                {selectedDay.entries.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                    Nenhuma entrada ainda para este dia.
                  </p>
                )}

                {selectedDay.entries.map((entry) => (
                  <article key={entry.id} className="space-y-2 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold text-emerald-200">{entry.mealLabel}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span>{entry.time}</span>
                        {entry.amount && <span>• {entry.amount}</span>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-100">{entry.food}</p>
                    {entry.notes && <p className="text-xs text-slate-400">Obs: {entry.notes}</p>}
                    <button
                      type="button"
                      onClick={() => removeEntry(selectedDay.id, entry.id)}
                      className="text-xs font-medium text-rose-300 transition hover:text-rose-200"
                    >
                      Remover entrada
                    </button>
                  </article>
                ))}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
