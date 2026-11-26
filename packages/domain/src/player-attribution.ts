/**
 * A primary actor of a segment: an identified roster player, or an unknown
 * player with an optional observed jersey number and never an invented identity.
 * See docs/technical/prototype-football-profile.md, "Required attribution".
 */
export type PlayerAttribution =
  | { readonly kind: "identified"; readonly playerId: string }
  | { readonly kind: "unknown"; readonly observedJersey?: number };
