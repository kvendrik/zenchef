export function parseDateToIso(dateStr: string): string {
  const parts = dateStr.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid date format "${dateStr}". Expected DD/MM.`);
  }
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  if (!Number.isInteger(day) || !Number.isInteger(month) || day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error(`Invalid date "${dateStr}". Day must be 1-31, month must be 1-12.`);
  }
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
    throw new Error(`Invalid date "${dateStr}". Day ${day} does not exist in month ${month}.`);
  }
  if (candidate.getTime() < now.setHours(0, 0, 0, 0)) {
    year += 1;
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}T12:00:00.000Z`;
}
