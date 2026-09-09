/** Uniform Fisher-Yates shuffle -- `.sort(() => Math.random() - 0.5)` is a well-known biased non-shuffle. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Shuffles which product goes first, then round-robins one image per
 * product per pass. A plain shuffle of every image still clusters --
 * a product with 5 images has a real chance of several landing next to
 * each other. Round-robin guarantees no two consecutive tiles are the
 * same product (once every other product has contributed to a round),
 * while the product order still varies between visits.
 */
export function interleaveShuffled<T>(groups: T[][]): T[] {
  const shuffledGroups = shuffle(groups).map((group) => shuffle(group));
  const maxLength = Math.max(0, ...shuffledGroups.map((group) => group.length));
  const result: T[] = [];
  for (let round = 0; round < maxLength; round++) {
    for (const group of shuffledGroups) {
      if (group[round] !== undefined) result.push(group[round]);
    }
  }
  return result;
}
