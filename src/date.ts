export function parseDateToIso(dateStr: string): string {
  const [day, month] = dateStr.split("/").map(Number);
  if (!day || !month) {
    throw new Error(`Invalid date format "${dateStr}". Expected DD/MM.`);
  }
  const year = new Date().getFullYear();
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}T10:30:00.000Z`;
}
