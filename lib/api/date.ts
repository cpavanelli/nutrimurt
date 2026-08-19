/**
 * Renders a timestamp as `dd/MM/yyyy HH:mm`, matching the .NET original's
 * format string.
 *
 * Deliberate deviation from the old behaviour: the .NET API called
 * `ToString("dd/MM/yyyy HH:mm")` on a `DateTime` that Npgsql returns with
 * `Kind=Utc`, and no container set a TZ, so production rendered UTC. Every
 * user of this app is in Brazil, so these timestamps read three hours ahead of
 * the wall clock the patient actually answered at. We render in
 * America/Sao_Paulo instead, which shifts displayed times by -3h against the
 * pre-migration app. That difference is expected, not a port bug.
 */
export function formatDateTime(value: Date | null): string | null {
  if (!value) return null;

  const parts = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
}
