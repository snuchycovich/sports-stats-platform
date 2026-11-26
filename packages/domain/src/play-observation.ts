import type { PlayerAttribution } from "./player-attribution";
import type { ObservedContext } from "./situation";

export type RushSegment = {
  readonly kind: "rush";
  readonly ballCarrier: PlayerAttribution;
  readonly yards: number;
};

export type ReceptionSegment = {
  readonly kind: "reception";
  readonly passer: PlayerAttribution;
  readonly receiver: PlayerAttribution;
  readonly yards: number;
};

export type IncompletionSegment = {
  readonly kind: "incompletion";
  readonly passer: PlayerAttribution;
  readonly target?: PlayerAttribution;
};

export type PlaySegment = RushSegment | ReceptionSegment | IncompletionSegment;

export type PlayMarker = "kneelDown" | "spike";

type ObservationContext = {
  readonly period: number;
  readonly clockSeconds?: number;
  readonly note?: string;
  readonly observedContext?: ObservedContext;
};

/**
 * Segmented play observation, payload version 1 (see docs/adr/ADR-002-segmented-play-observation.md).
 *
 * The first segment is typed by the outcome so every play has a coherent primary action
 * (ADR-002, decision 2); later segments use the general `PlaySegment` union so future kinds
 * can be appended without a payload migration.
 */
export type PlayObservationV1 =
  | (ObservationContext & {
      readonly family: "rush";
      readonly outcome: "rush";
      readonly marker?: "kneelDown";
      readonly segments: readonly [RushSegment, ...PlaySegment[]];
    })
  | (ObservationContext & {
      readonly family: "pass";
      readonly outcome: "complete";
      readonly segments: readonly [ReceptionSegment, ...PlaySegment[]];
    })
  | (ObservationContext & {
      readonly family: "pass";
      readonly outcome: "incomplete";
      readonly marker?: "spike";
      readonly segments: readonly [IncompletionSegment, ...PlaySegment[]];
    });

export type PlayObservation = PlayObservationV1;
