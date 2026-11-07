import { LABEL_MAX_LENGTH } from '../common/constants';

export interface NormalizedLabel {
  /** Texto tal cual se recibió (con trim) la primera vez. */
  name: string;
  /** Identidad de la etiqueta: trim + minúsculas. */
  normalizedName: string;
}

export function normalizeLabelName(raw: string): string {
  return raw.trim().toLowerCase().slice(0, LABEL_MAX_LENGTH);
}

/**
 * trim, descarta vacías y deduplica sin distinguir mayúsculas conservando la
 * primera forma recibida (CL-05, RN-10). Mantiene el orden de entrada.
 */
export function normalizeLabels(labels: readonly string[]): NormalizedLabel[] {
  const seen = new Set<string>();
  const result: NormalizedLabel[] = [];
  for (const raw of labels) {
    const name = raw.trim();
    if (name.length === 0) continue;
    const normalizedName = normalizeLabelName(name);
    if (seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    result.push({ name, normalizedName });
  }
  return result;
}
