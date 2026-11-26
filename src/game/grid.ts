// Adapted from OpenFrontIO GameMapImpl.neighbors (AGPL-3.0-only).
// Copyright OpenFront and Contributors. See THIRD_PARTY_NOTICES.md.
export function neighbors(ref: number, width: number, height: number): number[] {
  const result: number[] = [], x = ref % width;
  if (ref >= width) result.push(ref - width);
  if (ref < (height - 1) * width) result.push(ref + width);
  if (x !== 0) result.push(ref - 1);
  if (x !== width - 1) result.push(ref + 1);
  return result;
}
export function connected(start: number, accept: (tile: number) => boolean, width: number, height: number) {
  const seen = new Set<number>();
  if (!accept(start)) return seen;
  const queue = [start]; seen.add(start);
  for (let i = 0; i < queue.length; i++) for (const n of neighbors(queue[i], width, height)) {
    if (!seen.has(n) && accept(n)) { seen.add(n); queue.push(n); }
  }
  return seen;
}
