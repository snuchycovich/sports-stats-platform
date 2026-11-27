import type {
  PassingLine,
  PlayerStatLine,
  ReceivingLine,
  RushingLine,
  StatSubject,
} from "./engine";
import type { TeamSide } from "./game-setup";
import type { PlayObservation, PlaySegment } from "./play-observation";
import type { PlayerAttribution } from "./player-attribution";

const noRushing: RushingLine = { attempts: 0, yards: 0 };
const noPassing: PassingLine = { attempts: 0, completions: 0, yards: 0 };
const noReceiving: ReceivingLine = { receptions: 0, yards: 0 };

const zeroLine = (team: TeamSide, subject: StatSubject): PlayerStatLine => ({
  team,
  subject,
  rushing: noRushing,
  passing: noPassing,
  receiving: noReceiving,
});

const teamSubject: StatSubject = { kind: "team" };

const subjectOf = (attribution: PlayerAttribution): StatSubject =>
  attribution.kind === "identified"
    ? { kind: "player", playerId: attribution.playerId }
    : {
        kind: "unresolved",
        ...(attribution.observedJersey === undefined
          ? {}
          : { observedJersey: attribution.observedJersey }),
      };

const segmentLines = (segment: PlaySegment, team: TeamSide): readonly PlayerStatLine[] => {
  switch (segment.kind) {
    case "rush":
      return [
        {
          ...zeroLine(team, subjectOf(segment.ballCarrier)),
          rushing: { attempts: 1, yards: segment.yards },
        },
      ];
    case "reception":
      return [
        {
          ...zeroLine(team, subjectOf(segment.passer)),
          passing: { attempts: 1, completions: 1, yards: segment.yards },
        },
        {
          ...zeroLine(team, subjectOf(segment.receiver)),
          receiving: { receptions: 1, yards: segment.yards },
        },
      ];
    case "incompletion":
      return [
        {
          ...zeroLine(team, subjectOf(segment.passer)),
          passing: { attempts: 1, completions: 0, yards: 0 },
        },
      ];
  }
};

const requiredActors = (segment: PlaySegment): readonly PlayerAttribution[] => {
  switch (segment.kind) {
    case "rush":
      return [segment.ballCarrier];
    case "reception":
      return [segment.passer, segment.receiver];
    case "incompletion":
      return [segment.passer];
  }
};

const isKneelDown = (observation: PlayObservation): boolean =>
  observation.outcome === "rush" && observation.marker === "kneelDown";

const isSpike = (observation: PlayObservation): boolean =>
  observation.outcome === "incomplete" && observation.marker === "spike";

/**
 * Statistical lines a play credits, each fully zero-filled; only the primary segment is credited
 * under this profile. A kneel-down or spike is charged to the Team line, and an unknown actor
 * keeps an unresolved line.
 * See docs/technical/prototype-football-profile.md, "Credits".
 */
export const creditPlay = (
  observation: PlayObservation,
  team: TeamSide,
): readonly PlayerStatLine[] => {
  if (observation.outcome === "rush" && observation.marker === "kneelDown") {
    const [carry] = observation.segments;
    return [{ ...zeroLine(team, teamSubject), rushing: { attempts: 1, yards: carry.yards } }];
  }
  if (isSpike(observation)) {
    return [{ ...zeroLine(team, teamSubject), passing: { attempts: 1, completions: 0, yards: 0 } }];
  }
  const [primary] = observation.segments;
  return segmentLines(primary, team);
};

/**
 * Whether a required actor of the play is unknown, which calls for an `unresolved_identity`
 * issue. Kneel-downs and spikes have no required actor, and a target is optional.
 * See docs/technical/prototype-football-profile.md, "Required attribution".
 */
export const identityIssueNeeded = (observation: PlayObservation): boolean => {
  if (isKneelDown(observation) || isSpike(observation)) {
    return false;
  }
  const [primary] = observation.segments;
  return requiredActors(primary).some((actor) => actor.kind === "unknown");
};
