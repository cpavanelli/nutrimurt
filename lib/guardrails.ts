/**
 * Mirrors the pre-migration guardrails. The two legacy services held disjoint
 * sets: `Constants/Guardrails.cs` covered the CRUD limits, while
 * `app/constants/guardrails.py` covered the patient submission limits. Both are
 * reproduced here. `maxEmailSendsPerDay` is the only value the two shared, and
 * they agreed on it. The README's values are stale — do not use them.
 */
export const guardrails = {
  // Constants/Guardrails.cs
  maxPatients: 10,
  maxQuestionnaires: 10,
  maxQuestions: 10,
  maxAlternatives: 10,
  maxLinksPerPatient: 10,
  maxEmailSendsPerDay: 10,
  maxMealPlans: 20,
  maxMealPlanEntriesPerPlan: 50,

  // app/constants/guardrails.py — patient-facing submission limits
  maxDiaryEntriesPerDay: 50,
  maxDiaryDistinctDays: 90,
  maxTotalDiaryEntries: 4500,
  maxTextLength: 500,
  maxAnswerAlternativesPerQuestion: 10,
  maxQuestionsPerSubmission: 10,
} as const;
