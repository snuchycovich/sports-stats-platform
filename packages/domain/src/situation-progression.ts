import type { EngineInput, EngineIssue, PlaySituationResult } from "./engine";
import { fromYardsFromOwnGoal, toYardsFromOwnGoal } from "./field-position";
import type { FieldPosition } from "./game-setup";
import type { PlayRevision } from "./play-revision";
import { nextSituation } from "./progression";
import type { Ruleset } from "./ruleset";
import { distanceToGain, initialSituation } from "./series";
import type { ObservedContext, Situation } from "./situation";

/**
 * Situations of the ordered log and the issues found while calculating them.
 * See docs/technical/prototype-football-profile.md, "Situation after a supported play".
 */
export type SituationProgression = {
  readonly plays: readonly PlaySituationResult[];
  readonly situation: Situation | null;
  readonly issues: readonly EngineIssue[];
};

type CompleteObservedContext = Required<ObservedContext>;

const compareStrings = (a: string, b: string): number => (a < b ? -1 : Number(a > b));

const byOrderKey = (a: PlayRevision, b: PlayRevision): number =>
  compareStrings(a.orderKey, b.orderKey) || compareStrings(a.playId, b.playId);

const isComplete = (observed: ObservedContext): observed is CompleteObservedContext =>
  observed.possession !== undefined &&
  observed.down !== undefined &&
  observed.distance !== undefined &&
  observed.ballPosition !== undefined;

const samePosition = (a: FieldPosition, b: FieldPosition, ruleset: Ruleset): boolean =>
  toYardsFromOwnGoal(a, ruleset) === toYardsFromOwnGoal(b, ruleset);

/** Whether an observed value is present and differs from the calculated situation. */
const contradicts = (observed: ObservedContext, calculated: Situation, ruleset: Ruleset): boolean =>
  (observed.possession !== undefined && observed.possession !== calculated.possession) ||
  (observed.down !== undefined && observed.down !== calculated.down) ||
  (observed.distance !== undefined && observed.distance !== distanceToGain(calculated, ruleset)) ||
  (observed.ballPosition !== undefined &&
    !samePosition(observed.ballPosition, calculated.ballPosition, ruleset));

const situationObserved = (observed: CompleteObservedContext, ruleset: Ruleset): Situation => ({
  possession: observed.possession,
  down: observed.down,
  ballPosition: observed.ballPosition,
  lineToGain:
    observed.distance === "goal"
      ? { kind: "goal" }
      : {
          kind: "position",
          position: fromYardsFromOwnGoal(
            toYardsFromOwnGoal(observed.ballPosition, ruleset) + observed.distance,
            ruleset,
          ),
        },
});

const issue = (code: EngineIssue["code"], playId: string): EngineIssue => ({ code, playId });

type Progress = {
  readonly current: Situation | null;
  readonly plays: readonly PlaySituationResult[];
  readonly issues: readonly EngineIssue[];
};

const progressPlay =
  (ruleset: Ruleset) =>
  (progress: Progress, play: PlayRevision): Progress => {
    const observed = play.observation.observedContext ?? {};
    const restart = isComplete(observed) ? situationObserved(observed, ruleset) : null;
    const inconsistent =
      progress.current !== null && contradicts(observed, progress.current, ruleset);
    const before =
      progress.current === null || inconsistent ? (restart ?? progress.current) : progress.current;
    const result = before === null ? null : nextSituation(before, play.observation, ruleset);
    const after = result?.kind === "situation" ? result.situation : null;
    const issues: readonly EngineIssue[] = [
      ...(inconsistent ? [issue("inconsistent_consequence", play.playId)] : []),
      ...(result?.kind === "unsupported_consequence"
        ? [issue("unsupported_consequence", play.playId)]
        : []),
    ];
    return {
      current: after,
      plays: [...progress.plays, { playId: play.playId, before, after }],
      issues: [...progress.issues, ...issues],
    };
  };

/**
 * Calculates the situation before and after each play in `orderKey` order, from the starting
 * context. A play whose observed context contradicts the calculation is reported as
 * `inconsistent_consequence`; when that context is complete, progression continues from it.
 * After an unsupported consequence, progression restarts at the next complete observed context.
 * Observations are never rewritten.
 * See docs/technical/prototype-football-profile.md, "Situation after a supported play".
 */
export const progressSituations = (input: EngineInput, ruleset: Ruleset): SituationProgression => {
  const start: Progress = {
    current: initialSituation(input.setup.startingContext, ruleset),
    plays: [],
    issues: [],
  };
  const { current, plays, issues } = [...input.plays]
    .sort(byOrderKey)
    .reduce(progressPlay(ruleset), start);
  return { plays, situation: current, issues };
};
