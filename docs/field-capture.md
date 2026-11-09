# Field Capture Experience

## Product constraint

The operator has only a few seconds to observe and record a play. Live Capture must therefore remain on one screen and expose frequent actions directly. The rich domain model exists behind the interface; it must not become a sequence of menus. Reliability means recording every play and making uncertainty visible, not forcing every detail before the next snap.

Tablet landscape is the primary layout. Phone portrait provides the same essential capture actions with less simultaneous context. Desktop adds global visibility, keyboard shortcuts, Review Mode, and assisted post-game transcription. No essential business capability may exist on only one device class.

## Live Capture

The persistent screen contains the current period, optional clock, score, possession, down, distance, ball position, frequent play actions, yards entry, recent players, synchronization state, and recent play history. The ruleset determines which actions are available.

Frequent actions appear as large touch targets and keyboard shortcuts. An exceptional-action panel may contain rare events, but saving a common play must not require page navigation or nested menus. The interface carries forward possession, context, direction, and recently used players when safe. The operator can override any inferred value.

A minimal observation records:

- stable ID, order, period, and clock when known;
- known possession and starting context;
- play family and primary outcome;
- yards or observed final position;
- known primary participants, accepting an unresolved jersey number;
- score, turnover, penalty, or missing-information markers;
- an optional short note.

Unknown values are explicit. Saving a minimal play updates the provisional game, places the command in the outbox, and immediately prepares the next context. The recent-play list keeps incomplete states visible and allows correction of the latest play without leaving the screen.

## Review Mode

Review Mode uses the same `PlayObservation`, stable ID, and revision history. It never copies a play into a second dataset. During stoppages or after the game, a reviewer can identify players, add segments and defensive contributions, resolve penalties, compare observed and calculated contexts, and confirm the play.

The modes separate speed from completeness:

| Concern | Live Capture | Review Mode |
| --- | --- | --- |
| Goal | Do not miss the next play | Produce complete, explainable statistics |
| Inputs | Essential facts and uncertainty markers | Full segments, attribution, penalties, and corrections |
| Navigation | One persistent screen | Detailed sequence and issue views |
| Blocking | Local write failure only | Issues do not block ending capture; they keep results provisional and block official validation when required |

## End of capture

Ending capture is distinct from validating results. The operator may close the live session when the game ends even if some plays remain incomplete, contradictory, pending, or in conflict. Closing capture freezes neither the observations nor their revisions: Review Mode remains available without reopening a validated match.

The closing summary displays the unique number of uncertain plays and a breakdown by reason: missing details, unresolved identity, inconsistent consequence, synchronization conflict, or pending delivery. One play may have several reasons, so the breakdown may exceed the unique total. The operator confirms this summary before closing capture.

A closed match with issues has provisional statistics and reports. Official validation follows the competition's statistical policy and may require every mandatory issue to be resolved. This distinction ensures that field work can end without presenting uncertain results as final.

## Paper fallback and transcription

Before the game, the application generates a printable sheet containing match metadata, rosters, jersey numbers, compact event codes, and ordered play lines. The operator switches to it when a device, battery, or local-storage problem prevents safe digital capture. The fallback procedure records the switchover point so digital and paper sequences can later be reconciled.

Desktop assisted transcription accepts sequential entries from the generated sheet, optionally aligned with video timestamps. It provides keyboard-first entry, repeated previous values, rapid jersey lookup, and consistency checks after each series. The paper record and video are evidence; the resulting structured plays still pass the same rules and review workflow.

CSV import is deferred because it adds another transcription step. OCR is also deferred; a future photo workflow may create drafts only, and every recognized play must be validated by a human before entering the authoritative log.

## Usability acceptance

An experienced operator can save a common supported play without changing page or opening nested menus. Tests measure median and worst-case entry time, missed plays, deferred details, corrections, and storage failures on tablet, phone, and desktop. Offline capture, reload recovery, large touch targets, keyboard-only operation, immediate visibility of incomplete plays, and closing with an accurate uncertainty count are mandatory.
