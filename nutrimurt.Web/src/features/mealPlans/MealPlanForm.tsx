import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ApiError, useMealPlansApi } from './api';
import type { MealPlan, MealPlanInput } from './types';
import { usePatientsApi } from '../patients/api';
import type { Patient } from '../patients/types';
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../answers/types';
import { MAX_MEAL_PLAN_ENTRIES } from '../../constants/guardrails';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MealLabel, { MEAL_COLORS } from '../../components/ui/MealLabel';
import { Icon } from '../../components/ui/Icon';

type DraftEntry = {
  mealType: number;
  food: string;
  amount: string;
  substitution: boolean;
  substitution2: boolean;
};

type SubMode = 'none' | 'sub1' | 'sub2';

function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export default function MealPlanForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const planId = id ? Number(id) : undefined;

  const mealPlansApi = useMealPlansApi();
  const patientsApi = usePatientsApi();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [patientId, setPatientId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [mealPlanDate, setMealPlanDate] = useState<string>(todayIso());
  const [totalCals, setTotalCals] = useState<string>('');
  const [entries, setEntries] = useState<DraftEntry[]>([]);

  const [selectedMealType, setSelectedMealType] = useState<number>(1);
  const [foodDraft, setFoodDraft] = useState('');
  const [amountDraft, setAmountDraft] = useState('');
  const [subModeDraft, setSubModeDraft] = useState<SubMode>('none');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const patientList = await patientsApi.list();
        if (cancelled) return;
        setPatients(patientList);

        if (isEdit && planId) {
          const plan: MealPlan = await mealPlansApi.get(planId);
          if (cancelled) return;
          setPatientId(plan.patientId);
          setName(plan.name);
          setMealPlanDate(plan.mealPlanDate.split('T')[0]);
          setTotalCals(String(plan.totalCals ?? 0));
          setEntries(
            plan.entries.map((e) => ({
              mealType: e.mealType,
              food: e.food,
              amount: e.amount,
              substitution: e.substitution,
              substitution2: e.substitution2,
            }))
          );
        } else {
          const qpId = Number(searchParams.get('patientId'));
          if (qpId && patientList.some((p) => p.id === qpId)) {
            setPatientId(qpId);
          }
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Falha ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, planId]);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  );

  const headerTitle = selectedPatient?.name ?? (isEdit ? 'Plano Alimentar' : 'Novo Plano');

  const grouped = useMemo(() => {
    const map = new Map<
      number,
      { regular: DraftEntry[]; substitutions: DraftEntry[]; substitutions2: DraftEntry[] }
    >();
    entries.forEach((entry) => {
      const bucket = map.get(entry.mealType) ?? {
        regular: [],
        substitutions: [],
        substitutions2: [],
      };
      if (entry.substitution2) bucket.substitutions2.push(entry);
      else if (entry.substitution) bucket.substitutions.push(entry);
      else bucket.regular.push(entry);
      map.set(entry.mealType, bucket);
    });
    return MEAL_TYPES.map((mt) => ({
      mealType: mt,
      regular: map.get(mt)?.regular ?? [],
      substitutions: map.get(mt)?.substitutions ?? [],
      substitutions2: map.get(mt)?.substitutions2 ?? [],
    })).filter(
      (g) => g.regular.length > 0 || g.substitutions.length > 0 || g.substitutions2.length > 0
    );
  }, [entries]);

  const canAddEntry = foodDraft.trim().length > 0 && amountDraft.trim().length > 0;

  function addEntry() {
    if (!canAddEntry) return;
    if (entries.length >= MAX_MEAL_PLAN_ENTRIES) {
      toast.warn('Você atingiu o número máximo de entradas para este plano.');
      return;
    }
    setEntries((prev) => [
      ...prev,
      {
        mealType: selectedMealType,
        food: foodDraft.trim(),
        amount: amountDraft.trim(),
        substitution: subModeDraft === 'sub1',
        substitution2: subModeDraft === 'sub2',
      },
    ]);
    setFoodDraft('');
    setAmountDraft('');
  }

  function handleEnterKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEntry();
    }
  }

  function removeEntry(target: DraftEntry) {
    setEntries((prev) => {
      const idx = prev.indexOf(target);
      if (idx === -1) return prev;
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSave() {
    if (!patientId || entries.length === 0) return;
    const payload: MealPlanInput = {
      patientId: Number(patientId),
      name: name.trim() || `Plano Alimentar — ${selectedPatient?.name ?? ''}`,
      totalCals: Number(totalCals) || 0,
      mealPlanDate,
      entries: entries.map((e) => ({
        mealType: e.mealType,
        food: e.food,
        amount: e.amount,
        substitution: e.substitution,
        substitution2: e.substitution2,
      })),
    };
    try {
      setSubmitting(true);
      if (isEdit && planId) {
        await mealPlansApi.update(planId, payload);
        toast.success('Plano atualizado');
      } else {
        await mealPlansApi.create(payload);
        toast.success('Plano criado');
      }
      navigate('/mealplans');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao salvar';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen w-full bg-surface-base px-6 py-8 text-ink-primary lg:px-10">
        <div className="mx-auto w-full max-w-[1464px] text-sm text-ink-secondary">Carregando...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-surface-base px-6 py-8 text-ink-primary lg:px-10">
      <div className="mx-auto flex w-full max-w-[1464px] flex-col gap-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-ink-secondary transition hover:text-ink-primary"
        >
          <Icon name="arrowLeft" size={16} />
          Voltar
        </button>

        <div>
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-accent-text">
            PLANO ALIMENTAR
          </div>
          <h1 className="text-[22px] font-semibold">{headerTitle}</h1>
          <p className="mt-1 text-sm text-ink-secondary">Adicione os alimentos por refeição</p>
        </div>

        <Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                Paciente
              </label>
              <select
                value={patientId === '' ? '' : String(patientId)}
                onChange={(e) =>
                  setPatientId(e.target.value === '' ? '' : Number(e.target.value))
                }
                disabled={isEdit}
                className="rounded-lg border border-edge-soft bg-surface-elevated px-3 py-2.5 text-sm outline-none transition focus:border-accent-mid disabled:opacity-60"
              >
                <option value="">Selecione...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                Data do Plano
              </label>
              <input
                type="date"
                value={mealPlanDate}
                onChange={(e) => setMealPlanDate(e.target.value)}
                className="rounded-lg border border-edge-soft bg-surface-elevated px-3 py-2.5 text-sm outline-none transition focus:border-accent-mid [color-scheme:dark]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                Peso
              </label>
              <div className="rounded-lg border border-edge-soft bg-surface-elevated px-3 py-2.5 text-sm text-ink-secondary">
                {selectedPatient ? `${selectedPatient.weight} kg` : '—'}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                Total Calorias
              </label>
              <input
                type="number"
                min={0}
                placeholder="ex: 1800"
                value={totalCals}
                onChange={(e) => setTotalCals(e.target.value)}
                className="rounded-lg border border-edge-soft bg-surface-elevated px-3 py-2.5 text-sm outline-none transition focus:border-accent-mid"
              />
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-4 text-sm font-semibold">Adicionar Refeição</div>

          <div className="mb-3.5">
            <div className="mb-2 text-xs text-ink-secondary">Refeição:</div>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((mt) => {
                const active = selectedMealType === mt;
                const color = MEAL_COLORS[mt];
                return (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setSelectedMealType(mt)}
                    className={[
                      'rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition',
                      active ? '' : 'border-edge-soft text-ink-secondary hover:bg-surface-elevated',
                    ].join(' ')}
                    style={
                      active
                        ? {
                            borderColor: color,
                            background: `${color}22`,
                            color,
                          }
                        : undefined
                    }
                  >
                    {MEAL_TYPE_LABELS[mt]}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={subModeDraft === 'sub1'}
                  onChange={() => setSubModeDraft((m) => (m === 'sub1' ? 'none' : 'sub1'))}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Substituição
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={subModeDraft === 'sub2'}
                  onChange={() => setSubModeDraft((m) => (m === 'sub2' ? 'none' : 'sub2'))}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Substituição 2
              </label>
            </div>
          </div>

          <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-secondary">Alimento</label>
              <input
                type="text"
                placeholder="ex: Frango grelhado"
                value={foodDraft}
                onChange={(e) => setFoodDraft(e.target.value)}
                onKeyDown={handleEnterKey}
                className="rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-2.5 text-sm outline-none transition focus:border-accent-mid"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-secondary">Quantidade</label>
              <input
                type="text"
                placeholder="ex: 150g"
                value={amountDraft}
                onChange={(e) => setAmountDraft(e.target.value)}
                onKeyDown={handleEnterKey}
                className="rounded-lg border border-edge-soft bg-surface-elevated px-3.5 py-2.5 text-sm outline-none transition focus:border-accent-mid"
              />
            </div>
            <Button onClick={addEntry} disabled={!canAddEntry} icon="plus" className="h-[41px]">
              Adicionar
            </Button>
          </div>
        </Card>

        {grouped.length === 0 ? (
          <Card className="text-center text-sm text-ink-tertiary">
            Nenhum alimento adicionado ainda
          </Card>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
          >
            {grouped.map((group) => {
              const color = MEAL_COLORS[group.mealType];
              return (
                <Card key={group.mealType} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 shrink-0 rounded-full"
                      style={{ background: color }}
                    />
                    <MealLabel mealType={group.mealType} />
                  </div>

                  {group.regular.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {group.regular.map((entry, idx) => (
                        <EntryRow
                          key={`reg-${group.mealType}-${idx}`}
                          entry={entry}
                          onRemove={() => removeEntry(entry)}
                        />
                      ))}
                    </div>
                  )}

                  {group.substitutions.length > 0 && (
                    <>
                      <div className="mt-2 flex items-center gap-2 border-t border-edge-soft pt-3">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        <MealLabel mealType={group.mealType}>Substituição</MealLabel>
                      </div>
                      <div className="flex flex-col gap-2">
                        {group.substitutions.map((entry, idx) => (
                          <EntryRow
                            key={`sub-${group.mealType}-${idx}`}
                            entry={entry}
                            onRemove={() => removeEntry(entry)}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {group.substitutions2.length > 0 && (
                    <>
                      <div className="mt-2 flex items-center gap-2 border-t border-edge-soft pt-3">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ background: color }}
                        />
                        <MealLabel mealType={group.mealType}>Substituição 2</MealLabel>
                      </div>
                      <div className="flex flex-col gap-2">
                        {group.substitutions2.map((entry, idx) => (
                          <EntryRow
                            key={"sub2-" + group.mealType + "-" + idx}
                            entry={entry}
                            onRemove={() => removeEntry(entry)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={submitting || entries.length === 0 || !patientId}
          className="w-full py-3.5 text-[15px] font-semibold"
        >
          {submitting ? 'Salvando...' : 'Salvar Plano Alimentar'}
        </Button>
      </div>
    </main>
  );
}

function EntryRow({ entry, onRemove }: { entry: DraftEntry; onRemove: () => void }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-edge-soft bg-surface-elevated px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{entry.food}</div>
        <div className="mt-0.5 text-xs text-ink-secondary">{entry.amount}</div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-danger transition hover:opacity-80"
        aria-label="Remover alimento"
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  );
}
