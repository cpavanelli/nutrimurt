import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import React from "react";

import type { MealType } from "@/lib/db/schema";

import { registerPdfFonts } from "./fonts";

/**
 * Port of `Services/MealPlanPdfBuilder.cs`.
 *
 * QuestPDF and react-pdf both default to points, so every size, padding and
 * border width below is the number from the C# original unchanged. The layout
 * is the horizontal compact one from c59f8da: a summary strip, then the five
 * meal types as equal columns across an A4 landscape page.
 */

const ACCENT = "#1A7A5E";
const ACCENT_TEXT = "#145E48";
const BG_PANEL = "#F6F8FB";
const BG_ELEVATED = "#EDF0F6";
const BORDER = "#E8E8E8";
const TEXT_PRIMARY = "#1F1F1F";
const TEXT_SECONDARY = "#7B7B7B";
const TEXT_TERTIARY = "#ADADAD";

/**
 * Every meal type carried the same colours in the C# `Styles` dictionary. Kept
 * as a per-type lookup so a future palette change stays a one-line edit, as it
 * was there.
 */
const MEAL_STYLES: Record<
  MealType,
  { label: string; textColor: string; background: string; borderColor: string }
> = {
  1: {
    label: "Café da Manhã",
    textColor: ACCENT,
    background: "#E8F5F0",
    borderColor: "#70C4A8",
  },
  2: {
    label: "Almoço",
    textColor: ACCENT,
    background: "#E8F5F0",
    borderColor: "#70C4A8",
  },
  3: {
    label: "Café da Tarde",
    textColor: ACCENT,
    background: "#E8F5F0",
    borderColor: "#70C4A8",
  },
  4: {
    label: "Jantar",
    textColor: ACCENT,
    background: "#E8F5F0",
    borderColor: "#70C4A8",
  },
  5: {
    label: "Lanche",
    textColor: ACCENT,
    background: "#E8F5F0",
    borderColor: "#70C4A8",
  },
};

const MEAL_TYPE_ORDER: MealType[] = [1, 2, 3, 4, 5];

export interface MealPlanPdfEntry {
  id: number;
  mealType: MealType;
  food: string;
  amount: string;
  substitution: boolean;
  substitution2: boolean;
}

export interface MealPlanPdfData {
  id: number;
  patientName: string;
  patientWeight: number;
  name: string;
  totalCals: number;
  /** `yyyy-MM-dd`, straight from the `date` column. */
  mealPlanDate: string;
  entries: MealPlanPdfEntry[];
}

const styles = StyleSheet.create({
  page: {
    paddingVertical: "8mm",
    paddingHorizontal: "8mm",
    fontFamily: "DM Sans",
    fontSize: 5,
    color: TEXT_PRIMARY,
  },

  header: {
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
    flexDirection: "row",
  },
  headerLeft: { flexGrow: 1, flexShrink: 1 },
  headerRight: { width: 140, textAlign: "right" },
  brand: {
    fontFamily: "DM Mono",
    fontSize: 8,
    fontWeight: 700,
    color: ACCENT,
    letterSpacing: 0.16,
  },
  title: { paddingTop: 6, fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY },
  subtitle: { paddingTop: 2, fontSize: 8, color: TEXT_SECONDARY },
  headerMeta: { fontSize: 7, color: TEXT_SECONDARY },
  headerMetaSpaced: { paddingTop: 4, fontSize: 7, color: TEXT_SECONDARY },

  content: { paddingVertical: 8, flexGrow: 1 },

  summary: {
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
  },
  summaryCell: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    backgroundColor: BG_PANEL,
    padding: 6,
  },
  summaryCellDivided: { borderRightWidth: 1, borderRightColor: BORDER },
  summaryLabel: {
    fontSize: 5,
    fontWeight: 700,
    letterSpacing: 0.08,
    color: TEXT_TERTIARY,
  },
  summaryValue: { paddingTop: 2, fontSize: 7, fontWeight: 600 },

  mealsRow: { paddingTop: 10, flexDirection: "row" },
  mealColumn: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingHorizontal: 1 },

  mealHeader: {
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  swatch: { width: 5, height: 5, flexShrink: 0 },
  // The label sizes to its content and the count takes the rest, so the count
  // sits against the right edge — QuestPDF's AutoItem then RelativeItem
  // AlignRight. flexBasis 0 is required: with the default `auto`, the count
  // box shrinks to its text and lands immediately after the label.
  mealLabel: {
    paddingLeft: 4,
    fontSize: 5,
    fontWeight: 700,
    letterSpacing: 0.08,
    flexGrow: 0,
    flexShrink: 1,
  },
  mealCount: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingLeft: 4,
    textAlign: "right",
    fontSize: 5,
    color: TEXT_TERTIARY,
  },

  itemsFrame: {
    borderWidth: 1,
    borderColor: BORDER,
    borderTopWidth: 0,
  },
  emptyItems: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 5,
    fontStyle: "italic",
    color: TEXT_SECONDARY,
  },

  subHeading: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    borderTopColor: BORDER,
  },
  subSwatch: { width: 4, height: 4 },
  subLabel: {
    paddingLeft: 4,
    fontSize: 5,
    fontWeight: 700,
    letterSpacing: 0.08,
    color: "#000000",
  },

  itemRow: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 3,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    borderTopColor: BORDER,
  },
  itemFood: { flexGrow: 1, flexShrink: 1, fontSize: 5, fontWeight: 500 },
  itemAmount: {
    marginLeft: 4,
    backgroundColor: BG_ELEVATED,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 4,
    paddingVertical: 1,
    fontFamily: "DM Mono",
    fontSize: 4,
    color: TEXT_SECONDARY,
  },

  emptyPlan: {
    paddingTop: 20,
    textAlign: "center",
    fontSize: 8,
    fontStyle: "italic",
    color: TEXT_SECONDARY,
  },

  footer: {
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    flexDirection: "row",
  },
  footerText: { flexGrow: 1, flexShrink: 1, fontSize: 6, color: TEXT_TERTIARY },
  footerTextRight: {
    flexGrow: 1,
    flexShrink: 1,
    textAlign: "right",
    fontSize: 6,
    color: TEXT_TERTIARY,
  },
});

/** `dd/MM/yyyy` from a `yyyy-MM-dd` column value, with no timezone in play. */
function formatPlanDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** Matches `ToString("#,##0", pt-BR)` — thousands separated by a full stop. */
function formatThousands(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function SummaryCell({
  label,
  value,
  accent = false,
  last = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.summaryCell, ...(last ? [] : [styles.summaryCellDivided])]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryValue,
          { color: accent ? ACCENT_TEXT : TEXT_PRIMARY },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function ItemRow({
  entry,
  divider,
}: {
  entry: MealPlanPdfEntry;
  divider: boolean;
}) {
  return (
    <View style={[styles.itemRow, { borderTopWidth: divider ? 1 : 0 }]}>
      <Text style={styles.itemFood}>{entry.food}</Text>
      <Text style={styles.itemAmount}>{entry.amount}</Text>
    </View>
  );
}

function SubHeading({
  label,
  color,
  divider,
}: {
  label: string;
  color: string;
  divider: boolean;
}) {
  return (
    <View style={[styles.subHeading, { borderTopWidth: divider ? 1 : 0 }]}>
      <View style={[styles.subSwatch, { backgroundColor: color }]} />
      <Text style={styles.subLabel}>{label}</Text>
    </View>
  );
}

function MealSection({
  mealType,
  entries,
}: {
  mealType: MealType;
  entries: MealPlanPdfEntry[];
}) {
  const style = MEAL_STYLES[mealType];

  // Order matters: an entry flagged both ways counts as a second
  // substitution, never as a first. Same precedence as the C# filters.
  const substitutions2 = entries.filter((entry) => entry.substitution2);
  const substitutions = entries.filter(
    (entry) => entry.substitution && !entry.substitution2,
  );
  const regular = entries.filter(
    (entry) => !entry.substitution && !entry.substitution2,
  );

  return (
    <View style={styles.mealColumn}>
      <View
        style={[
          styles.mealHeader,
          { backgroundColor: style.background, borderColor: style.borderColor },
        ]}
      >
        <View style={[styles.swatch, { backgroundColor: style.textColor }]} />
        <Text style={[styles.mealLabel, { color: style.textColor }]}>
          {style.label.toLocaleUpperCase("pt-BR")}
        </Text>
        <Text style={styles.mealCount}>
          {entries.length} {entries.length === 1 ? "item" : "itens"}
        </Text>
      </View>

      <View style={styles.itemsFrame}>
        {entries.length === 0 ? (
          <Text style={styles.emptyItems}>Sem itens</Text>
        ) : (
          <>
            {regular.map((entry, index) => (
              <ItemRow key={entry.id} entry={entry} divider={index > 0} />
            ))}

            {substitutions.length > 0 && (
              <>
                <SubHeading
                  label="SUBSTITUIÇÃO"
                  color={style.textColor}
                  divider={regular.length > 0}
                />
                {substitutions.map((entry, index) => (
                  <ItemRow key={entry.id} entry={entry} divider={index > 0} />
                ))}
              </>
            )}

            {substitutions2.length > 0 && (
              <>
                <SubHeading
                  label="SUBSTITUIÇÃO 2"
                  color={style.textColor}
                  divider={regular.length > 0 || substitutions.length > 0}
                />
                {substitutions2.map((entry, index) => (
                  <ItemRow key={entry.id} entry={entry} divider={index > 0} />
                ))}
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

export function MealPlanDocument({
  plan,
  issuedAt = new Date(),
}: {
  plan: MealPlanPdfData;
  issuedAt?: Date;
}) {
  registerPdfFonts();

  const planDate = formatPlanDate(plan.mealPlanDate);
  const issuedDate = `${String(issuedAt.getDate()).padStart(2, "0")}/${String(
    issuedAt.getMonth() + 1,
  ).padStart(2, "0")}/${issuedAt.getFullYear()}`;

  const byMealType = new Map<MealType, MealPlanPdfEntry[]>();
  for (const entry of plan.entries) {
    const bucket = byMealType.get(entry.mealType) ?? [];
    bucket.push(entry);
    byMealType.set(entry.mealType, bucket);
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.brand}>NUTRIMURT</Text>
            <Text style={styles.title}>Plano Alimentar</Text>
            <Text style={styles.subtitle}>{plan.patientName}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerMeta}>Emitido em {issuedDate}</Text>
            <Text style={styles.headerMetaSpaced}>Portal do Nutricionista</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.summary}>
            <SummaryCell label="PACIENTE" value={plan.patientName} />
            <SummaryCell label="DATA DO PLANO" value={planDate} />
            <SummaryCell
              label="PESO"
              value={plan.patientWeight > 0 ? `${plan.patientWeight} kg` : "—"}
            />
            <SummaryCell
              label="TOTAL CALORIAS"
              value={`${formatThousands(plan.totalCals)} kcal`}
              accent
              last
            />
          </View>

          {plan.entries.length === 0 ? (
            <Text style={styles.emptyPlan}>Sem itens neste plano alimentar.</Text>
          ) : (
            <View style={styles.mealsRow}>
              {MEAL_TYPE_ORDER.map((mealType) => (
                <MealSection
                  key={mealType}
                  mealType={mealType}
                  entries={byMealType.get(mealType) ?? []}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Nutrimurt — Portal do Nutricionista
          </Text>
          <Text style={styles.footerTextRight}>
            {plan.patientName} · {planDate}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
