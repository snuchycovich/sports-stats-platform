# Mexican Statistics Sheet

## Purpose and evidence

The current Mexican field form is preserved as the [source form](<estadísticas futbol americano.pdf>). It combines team and player totals with compact play-detail areas. The application will generate an equivalent team-centered screen and PDF from structured game projections; form cells are never the calculation source of truth.

No completed example or official legend is available. Interpretations of `d`, `Y'DS`, `OBSER`, `n/yds`, `QT/QT`, and parts of the defensive grid are hypotheses until a Mexican statistician validates them. Visual similarity is secondary to statistical equivalence, readability, and exportability.

## Projection mapping

| Form area | Required observations | Generated result |
| --- | --- | --- |
| Kickoff kickers | Kick type, kicker, distance, outcome | Attempts and yards by kicker |
| Punters | Punt segment, punter, distance, outcome | Punts and yards by punter |
| Kickoff and punt returners | Return segment, returner, yards, outcome | Returns and return yards |
| Rushers | Rush segment, rusher, yards, score and first-down consequences | Attempts, yards and applicable scoring totals |
| Passers and receivers | Passer, receiver when applicable, outcome, yards and interception | Attempts, completions, receptions and yards |
| Scorers | Typed scoring event and beneficiary when applicable | Team and player scoring summary |
| Penalties | Rule, team/player, disposition, enforcement and yards | Penalty count and enforced yards |
| First downs | Ordered context transition under the ruleset | First-down totals by validated category |
| Lost balls | Fumble, recovery, team and possession outcome | Fumbles and fumbles lost |
| Interceptions | Pass, interceptor, return segment and yards | Interceptions and return yards |
| Field goals and extra points | Kick type, distance, kicker and good/missed/blocked outcome | Attempts, successes and points |
| Defense | Tackler, assistant and other policy-defined credits | Solo, assisted and validated defensive totals |
| Play detail | Down, yards, observation and ordered context | Compact trace supporting the totals |

Multi-phase plays retain separate segments. An intercepted pass followed by a return and fumble must attribute passing, interception, return, fumble, and recovery facts without mixing their yards. Penalty enforcement and statistical attribution follow the selected ruleset and statistical policy.

## Output contract

`MexicanStatSheetProjection` is derived from the canonical `GameProjection` for one selected team. It contains match identity, team and opponent, scores, source game revision, ruleset, statistical-policy and engine versions, player lines, team summaries, compact play details, unresolved issues, and provisional or validated status. When capture ends with uncertainty, the report displays the unique uncertain-play count and its reason breakdown; it must not look like an approved final report.

The screen and PDF use the same projection. Generating the opposing team's sheet changes perspective, not the underlying observations. Regeneration after a correction replaces the derived output only when the source game revision is current. Historical approved reports remain identifiable through their source versions.

The printable fallback sheet is a different artifact: it is prepared before the game with roster and event codes, then used for handwritten collection during a technical failure. It does not claim calculated totals until transcribed and validated.

## Coverage and validation

The rush/pass prototype demonstrates the calculation and capture architecture but cannot generate the complete report. Pilot parity requires offense, special teams, turnovers, penalties, scoring, first downs, and defensive contributions for the selected ruleset.

Reference games must cover every row family and be totaled independently by a qualified statistician. Tests verify browser/server equality, no double-counting of team offense, separation of return yards, correction-driven regeneration, explicit incomplete data, and duplicate-free offline retries. Official parity remains unclaimed until the ambiguous labels and statistical conventions are validated.
