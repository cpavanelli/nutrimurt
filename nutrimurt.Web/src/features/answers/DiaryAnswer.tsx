import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MAX_DIARY_ENTRIES_PER_DAY } from '../../constants/guardrails';
import { ApiError } from '../../lib/apiClient';
import { answersApi } from './pyApi';
import type { PatientLink, DiaryEntry, DiaryDayInput } from './types';
import { MEAL_TYPE_LABELS, MEAL_TYPES } from './types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MealLabel from '../../components/ui/MealLabel';
import { Icon } from '../../components/ui/Icon';

interface Props {
  patientLink: PatientLink | null;
  readOnly?: boolean;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
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
    if (matching.length > 0) groups.push({ mealType: mt, entries: matching });
  }
  return groups;
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
    setDays((prev) => sortDays([...prev, { date: newDayStr, entries: [] }]));
    setCurrentDayIndex(days.length);
  };

  useEffect(() => {
    setFormPatientLink(patientLink);

    const serverEntries = patientLink?.diary?.entries ?? [];
    const entriesByDate: Record<string, DiaryDayInput['entries']> = {};

    serverEntries.forEach((entry) => {
      const date = entry.date.split('T')[0];
      if (!entriesByDate[date]) entriesByDate[date] = [];
      entriesByDate[date].push({
        date,
        mealType: entry.mealType,
        time: normalizeTime(entry.time),
        food: entry.food,
        amount: entry.amount,
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
    amount: '',
  });

  const hasRequiredEntryFields = entryDraft.food && entryDraft.amount;

  const addEntry = () => {
    if (readOnly || !hasRequiredEntryFields || !currentDay) return;
    if (currentDay.entries.length >= MAX_DIARY_ENTRIES_PER_DAY) {
      toast.warn('Você atingiu o número máximo de entradas por dia.');
      return;
    }
    const newEntry: Omit<DiaryEntry, 'id' | 'patientDiaryId'> = {
      date: currentDay.date,
      mealType: selectedMealType,
      time: null,
      food: entryDraft.food,
      amount: entryDraft.amount,
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
    const sorted = sortDays(days.map((d, i) => (i === index ? { ...d, date: newDate } : d)));
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
          patientDiaryId: formPatientLink.diaryId,
        }))
      );

      await answersApi.savePatientDiary(formPatientLink);
      setStatus('success');
      toast.success('Diário enviado com sucesso');
    } catch (err) {
      setStatus('error');
      console.error('Error saving answers', err);
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message || 'Você atingiu o número máximo de entradas por dia.');
      } else {
        toast.error('Falha ao enviar diário. Tente novamente.');
      }
    }
  };

  return (
    <main className="min-h-screen bg-surface-base px-6 py-8 text-ink-primary lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {readOnly && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-ink-secondary transition hover:text-ink-primary"
          >
            <Icon name="arrowLeft" size={16} />
            Voltar
          </button>
        )}

        <div>
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent-text">
            NUTRIMURT
          </div>
          <h1 className="text-[22px] font-semibold">Diário Alimentar</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {patientLink?.diary?.name
              ? `Diário: ${patientLink.diary.name}`
              : 'Registre cada refeição do dia.'}
          </p>
        </div>

        {!readOnly && (
          <Card>
            <div className="mb-3 text-sm font-semibold">Dias do diário</div>
            <div className="flex flex-wrap gap-2">
              {days.map((day, index) =>
                index === currentDayIndex ? (
                  <div
                    key={`${day.date}-${index}`}
                    className="inline-flex items-center rounded-full border border-accent bg-accent px-3 py-1"
                  >
                    <input
                      type="date"
                      value={day.date}
                      onChange={(e) => handleDateChange(index, e.target.value)}
                      aria-label={`Selecionar data do dia ${formatDate(day.date)}`}
                      className="rounded-lg bg-transparent text-[13px] font-medium text-[#0b0f1a] outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                ) : (
                  <button
                    key={`${day.date}-${index}`}
                    type="button"
                    onClick={() => setCurrentDayIndex(index)}
                    className="rounded-full border border-edge-soft bg-transparent px-3.5 py-1 text-[13px] font-medium text-ink-secondary transition hover:bg-surface-elevated"
                  >
                    {formatDate(day.date)}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={addDiaryDay}
                disabled={!canAddNewDay}
                className="rounded-full border border-accent-mid bg-transparent px-3.5 py-1 text-[13px] font-medium text-accent-text transition hover:bg-accent-dim disabled:cursor-not-allowed disabled:opacity-40"
              >
                + Adicionar dia
              </button>
            </div>
          </Card>
        )}

        {!readOnly && (
          <Card>
            <div className="mb-4 text-sm font-semibold">Adicionar Refeição</div>
            <div className="mb-3.5">
              <div className="mb-2 text-xs text-ink-secondary">Refeição:</div>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setSelectedMealType(mt)}
                    className={[
                      'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
                      selectedMealType === mt
                        ? 'border-accent bg-accent text-[#0b0f1a]'
                        : 'border-edge-soft text-ink-secondary hover:bg-surface-elevated',
                    ].join(' ')}
                  >
                    {MEAL_TYPE_LABELS[mt]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink-secondary">Alimento</label>
                <input
                  type="text"
                  placeholder="ex: Frango grelhado"
                  value={entryDraft.food}
                  onChange={(e) => setEntryDraft((prev) => ({ ...prev, food: e.target.value }))}
                  className="rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-2.5 text-sm outline-none transition focus:border-accent-mid"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-ink-secondary">Quantidade</label>
                <input
                  type="text"
                  placeholder="ex: 200g"
                  value={entryDraft.amount}
                  onChange={(e) => setEntryDraft((prev) => ({ ...prev, amount: e.target.value }))}
                  className="rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-2.5 text-sm outline-none transition focus:border-accent-mid"
                />
              </div>
              <Button onClick={addEntry} disabled={!hasRequiredEntryFields} className="h-[41px]">
                Adicionar
              </Button>
            </div>
          </Card>
        )}

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
        >
          {days.length === 0 && (
            <Card className="text-sm text-ink-tertiary">Sem entradas neste diário.</Card>
          )}
          {days.map((day, dayIndex) => {
            const mealGroups = groupByMealType(sortEntries(day.entries));
            return (
              <Card
                key={`${day.date}-${dayIndex}`}
                className="flex flex-col gap-3"
              >
                <div className="text-[13px] font-semibold text-ink-secondary">
                  {formatDate(day.date)}
                </div>
                {mealGroups.length === 0 ? (
                  <div className="rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-3 text-sm text-ink-tertiary">
                    Sem entradas neste dia.
                  </div>
                ) : (
                  mealGroups.map((group) => (
                    <div key={group.mealType} className="flex flex-col gap-2">
                      {group.entries.map((entry, entryIndex) => {
                        const globalIndex = day.entries.indexOf(entry);
                        return (
                          <div
                            key={`${entry.mealType}-${entry.food}-${entryIndex}`}
                            className="rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-3"
                          >
                            <MealLabel mealType={entry.mealType} className="mb-1.5 block" />
                            {entry.time && (
                              <div className="text-xs text-ink-tertiary">{entry.time}</div>
                            )}
                            <div className="text-sm font-semibold">{entry.food}</div>
                            <div className="mt-0.5 text-xs text-ink-secondary">{entry.amount}</div>
                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => removeEntry(dayIndex, globalIndex)}
                                className="mt-1.5 text-xs font-medium text-danger transition hover:opacity-80"
                              >
                                Remover entrada
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </Card>
            );
          })}
        </div>

        {!readOnly && (
          <Button
            onClick={onSubmit}
            disabled={totalEntries === 0 || status === 'submitting'}
            className="w-full py-3.5 text-[15px] font-semibold"
          >
            {status === 'submitting' ? 'Enviando...' : 'Salvar Diário'}
          </Button>
        )}
      </div>
    </main>
  );
}
