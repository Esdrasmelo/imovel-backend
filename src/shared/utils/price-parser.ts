export function parsePreco(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;

  const cleaned = raw
    .replace(/R\$\s*/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const value = parseFloat(cleaned);
  return isNaN(value) ? null : value;
}

