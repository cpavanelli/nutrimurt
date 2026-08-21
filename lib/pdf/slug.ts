/**
 * Port of `PatientMealPlansController.Slugify`. The .NET version decomposed to
 * NFD, dropped non-spacing marks, lowercased, then collapsed every run of
 * non-alphanumerics into a single hyphen and trimmed hyphens from both ends.
 *
 * The filename this produces is what the browser saves the PDF as, so it has
 * to keep matching.
 */
export function slugify(input: string): string {
  if (!input || !input.trim()) return "paciente";

  const ascii = input
    .normalize("NFD")
    // \p{Mn} is Unicode's non-spacing mark category, the same set
    // CharUnicodeInfo.GetUnicodeCategory called NonSpacingMark.
    .replace(/\p{Mn}/gu, "")
    .normalize("NFC")
    .toLowerCase();

  const slug = ascii.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return slug || "paciente";
}
