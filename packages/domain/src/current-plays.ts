import type { PlayRevision } from "./play-revision";

const keepHighest = (
  current: readonly PlayRevision[],
  candidate: PlayRevision,
): readonly PlayRevision[] => {
  const existing = current.find((play) => play.playId === candidate.playId);
  if (existing === undefined) {
    return [...current, candidate];
  }
  return candidate.revision > existing.revision
    ? current.map((play) => (play === existing ? candidate : play))
    : current;
};

const compareStrings = (a: string, b: string): number => (a < b ? -1 : Number(a > b));

const byOrderKey = (a: PlayRevision, b: PlayRevision): number =>
  compareStrings(a.orderKey, b.orderKey) || compareStrings(a.playId, b.playId);

/**
 * Current plays of a revision history: the highest revision of each play, ordered by the
 * current revision's `orderKey` compared as a string. Superseded revisions are left out.
 *
 * Precondition: each (`playId`, `revision`) pair is unique; the contracts and the server
 * guarantee it.
 * See docs/technical/domain-model.md, "Ordered log and revisions".
 */
export const selectCurrentPlays = (history: readonly PlayRevision[]): readonly PlayRevision[] => {
  const current = history.reduce(keepHighest, []);
  return [...current].sort(byOrderKey);
};
