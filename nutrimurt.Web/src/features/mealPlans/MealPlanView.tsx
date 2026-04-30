import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError, useMealPlansApi } from './api';
import type { MealPlan, MealPlanEntry } from './types';
import { MEAL_TYPES, MEAL_TYPE_LABELS } from '../answers/types';
import Card from '../../components/ui/Card';
import { MEAL_COLORS } from '../../components/ui/MealLabel';
import { Icon } from '../../components/ui/Icon';

function formatDate(value: string): string {
  if (!value) return '-';
  const [datePart] = value.split('T');
  const [y, m, d] = datePart.split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function MealPlanView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const planId = id ? Number(id) : undefined;
  const api = useMealPlansApi();

  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!planId) return;
      try {
        setLoading(true);
        const data = await api.get(planId);
        if (!cancelled) setPlan(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          if (!cancelled) setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const grouped = useMemo(() => {
    if (!plan) return [];
    const map = new Map<number, { regular: MealPlanEntry[]; substitutions: MealPlanEntry[] }>();
    plan.entries.forEach((entry) => {
      const bucket = map.get(entry.mealType) ?? { regular: [], substitutions: [] };
      if (entry.substitution) bucket.substitutions.push(entry);
      else bucket.regular.push(entry);
      map.set(entry.mealType, bucket);
    });
    return MEAL_TYPES.map((mt) => ({
      mealType: mt,
      regular: map.get(mt)?.regular ?? [],
      substitutions: map.get(mt)?.substitutions ?? [],
    })).filter((g) => g.regular.length > 0 || g.substitutions.length > 0);
  }, [plan]);

  if (loading) {
    return (
      <main className="min-h-screen bg-surface-base px-6 py-8 text-ink-primary lg:px-10">
        <div className="mx-auto max-w-6xl text-sm text-ink-secondary">Carregando...</div>
      </main>
    );
  }

  if (notFound || !plan) {
    return (
      <main className="min-h-screen bg-surface-base px-6 py-8 text-ink-primary lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 py-20 text-center">
          <div className="text-base font-semibold">Plano não encontrado</div>
          <button
            type="button"
            onClick={() => navigate('/mealplans')}
            className="text-sm text-accent-text hover:underline"
          >
            Voltar para a lista
          </button>
        </div>
      </main>
    );
  }

  const summary = [
    { label: 'Paciente', value: plan.patientName },
    { label: 'Data do Plano', value: formatDate(plan.mealPlanDate) },
    { label: 'Peso', value: `${plan.patientWeight} kg` },
    {
      label: 'Total Calorias',
      value: plan.totalCals ? `${plan.totalCals} kcal` : '—',
      accent: true,
    },
  ];

  return (
    <main className="min-h-screen bg-surface-base px-6 py-8 text-ink-primary lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
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
            NUTRIMURT
          </div>
          <h1 className="text-[22px] font-semibold">{plan.name || 'Plano Alimentar'}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Criado em {formatDate(plan.createdAt)}
          </p>
        </div>

        <Card>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summary.map((item) => (
              <div key={item.label}>
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary">
                  {item.label}
                </div>
                <div
                  className={[
                    'text-[15px] font-semibold',
                    item.accent ? 'text-accent-text' : 'text-ink-primary',
                  ].join(' ')}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {grouped.length === 0 ? (
          <Card className="text-center text-sm text-ink-tertiary">
            Este plano não possui alimentos.
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {grouped.map((group) => {
              const color = MEAL_COLORS[group.mealType];
              return (
                <Card key={group.mealType} className="overflow-hidden p-0">
                  <MealSectionHeader
                    color={color}
                    title={MEAL_TYPE_LABELS[group.mealType]}
                    count={group.regular.length}
                  />
                  {group.regular.length > 0 && (
                    <div className="py-2">
                      {group.regular.map((entry, i) => (
                        <ItemRow key={`reg-${entry.id}-${i}`} entry={entry} divider={i > 0} />
                      ))}
                    </div>
                  )}

                  {group.substitutions.length > 0 && (
                    <>
                      <MealSectionHeader
                        color={color}
                        title="SUBSTITUIÇÃO"
                        count={group.substitutions.length}
                      />
                      <div className="py-2">
                        {group.substitutions.map((entry, i) => (
                          <ItemRow key={`sub-${entry.id}-${i}`} entry={entry} divider={i > 0} />
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function MealSectionHeader({
  color,
  title,
  count,
}: {
  color: string;
  title: string;
  count: number;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3.5"
      style={{
        background: `${color}18`,
        borderBottom: `1px solid ${color}30`,
      }}
    >
      <span
        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      <span
        className="text-[13px] font-bold uppercase tracking-[0.08em]"
        style={{ color }}
      >
        {title}
      </span>
      <span className="ml-auto text-xs text-ink-tertiary">
        {count} {count === 1 ? 'item' : 'itens'}
      </span>
    </div>
  );
}

function ItemRow({ entry, divider }: { entry: MealPlanEntry; divider: boolean }) {
  return (
    <div
      className={[
        'flex items-center justify-between px-4 py-2.5',
        divider ? 'border-t border-edge-soft' : '',
      ].join(' ')}
    >
      <div className="text-[15px] font-medium">{entry.food}</div>
      <div className="ml-3 shrink-0 rounded-md border border-edge-soft bg-surface-elevated px-2.5 py-0.5 font-mono text-[13px] text-ink-secondary">
        {entry.amount}
      </div>
    </div>
  );
}
