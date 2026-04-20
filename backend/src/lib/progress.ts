export type ProgressInput = {
  totalPageCount: number;
  completedPageCount: number;
  hasKapak: boolean;
  hasKutu: boolean;
  hasMedya: boolean;
  kapakComplete: boolean;
  kutuComplete: boolean;
  medyaComplete: boolean;
};

/**
 * Equal weight: page bucket (0–1) + each enabled optional component (0 or 1).
 * Denominator = 1 + number of optional flags enabled.
 */
export function computeProgressPercent(input: ProgressInput): number {
  const {
    totalPageCount,
    completedPageCount,
    hasKapak,
    hasKutu,
    hasMedya,
    kapakComplete,
    kutuComplete,
    medyaComplete,
  } = input;

  if (totalPageCount <= 0) {
    return 0;
  }

  const pageRatio = Math.min(Math.max(completedPageCount / totalPageCount, 0), 1);

  let optionalWeight = 0;
  let optionalDone = 0;
  if (hasKapak) {
    optionalWeight += 1;
    if (kapakComplete) optionalDone += 1;
  }
  if (hasKutu) {
    optionalWeight += 1;
    if (kutuComplete) optionalDone += 1;
  }
  if (hasMedya) {
    optionalWeight += 1;
    if (medyaComplete) optionalDone += 1;
  }

  const denom = 1 + optionalWeight;
  const num = pageRatio + optionalDone;
  return Math.round((num / denom) * 10000) / 100;
}
