# Prototype Football Profile

> **Prototype only.** This profile supports the first development slice. It does not provide official NCAA, NFL, or ONEFA rules coverage, and results calculated under it are not official statistics.

## Identity

The profile is made of two separately versioned references, as required by the [domain model](domain-model.md#three-independent-versions):

| Reference | Identifier | Responsibility |
| --- | --- | --- |
| Ruleset | `prototype-tackle/0.1.0` | Field, downs, situation progression, and possession change after a supported play |
| Statistical policy | `prototype-rush-pass/0.1.0` | Attribution of rushing, passing, receiving, and first-down totals |

Both follow NCAA conventions for the supported subset: the [NCAA Football Rules Book](https://ncaaorg.s3.amazonaws.com/championships/sports/football/rules/PRMFB_RulesBook.pdf) for the ruleset and the [NCAA Football Statisticians' Manual](https://fs.ncaa.org.s3.amazonaws.com/Docs/stats/Stats_Manuals/Football.pdf) for the statistical policy. Later versions can grow toward the selected pilot ruleset without changing the meaning of statistics already recorded. Any change to a rule or attribution below creates a new version; games keep the versions they were captured with.

## Scope

The profile supports three observations, each a single-segment `PlayObservation` as defined in [ADR-002](../adr/ADR-002-segmented-play-observation.md):

| Observation | Segment kind | Yards |
| --- | --- | --- |
| Rush | `rush` | Required, whole number, may be negative |
| Complete pass | `reception` | Required, whole number, may be negative |
| Incomplete pass | `incompletion` | None |

Two clock plays reuse these observations with a marker, because NCAA credits them differently:

| Clock play | Recorded as | Marker |
| --- | --- | --- |
| Kneel-down to run out the clock | Rush, usually with negative yards | `kneelDown` |
| Spike (deliberate throw to the ground to stop the clock) | Incomplete pass without a target | `spike` |

A quarterback scramble is an ordinary rush.

## Ruleset `prototype-tackle/0.1.0`

### Field and periods

- The field is 100 yards. Ball position uses the convention of the [domain model](domain-model.md#field-position-and-yards): `own` or `opponent` plus a yard line from 1 to 49, or `midfield`, from the point of view of the team in possession at the snap.
- A game has 4 periods. The period and optional clock are recorded on each play but are not progressed or enforced by this ruleset.

### Series and line to gain

A team in possession has 4 downs to reach the **line to gain**. The line to gain is fixed when a series starts: 10 yards beyond the ball, or the opponent's goal line when that is nearer ("goal to go"). It does not move during the series. The distance shown with the down is the number of yards from the ball to the line to gain; in a goal-to-go series it is shown as "and goal", even after a loss.

### Starting context

A game starts from an explicit context supplied before capture:

- distinct home and away teams;
- one roster per team, mapping jersey numbers to players;
- the team in possession;
- period 1 and a new series at first down;
- the starting ball position (for example, own 25).

The line to gain is derived from the starting position by the rule above: a game whose capture starts at opponent 7 starts at 1st & goal.

### Dead-ball spot

The yards of a rush or complete pass are measured from the previous spot to the **dead-ball spot marked by the officials**, including forward progress, not to wherever the ball carrier is finally pushed. A runner whose forward progress is stopped at the own 1 and who is then driven into the end zone has a dead-ball spot at the 1. An incomplete pass returns the ball to the previous spot.

### Situation after a supported play

The new ball position is the previous position moved by the play's net yards toward the opponent's goal line (backward when negative). Positions are converted through `midfield` when the ball crosses it: from own 45, a 10-yard gain ends at opponent 45.

Then, in this order:

1. **Unsupported consequence.** If the dead-ball spot is in the opponent's end zone (touchdown), or in the offense's own end zone with the offense responsible for the ball being there (safety), the engine reports an `unsupported_consequence` issue for the play. It does not calculate the following situation and does not alter the observation to fit a supported result. Later plays keep their observed context and are checked against it. In this profile every supported play is a scrimmage play by the offense, so the offense is responsible.
2. **First down.** If the ball reaches or passes the line to gain, the same team starts a new series at first down.
3. **Next down.** Otherwise, if the down was first, second, or third, the down increases by one and the line to gain stays where it is.
4. **Turnover on downs.** Otherwise the fourth down failed. Possession passes to the other team at the dead-ball spot, re-expressed from the new offense's point of view (`opponent N` becomes `own N`, `own N` becomes `opponent N`, `midfield` stays `midfield`), and a new series starts at first down.

## Statistical policy `prototype-rush-pass/0.1.0`

### Required attribution

Primary actors are typed segment fields. Each is a `PlayerAttribution`: an identified roster player, or unknown with an optional observed jersey number.

| Observation | Required | Optional |
| --- | --- | --- |
| Rush | Ball carrier | — |
| Kneel-down | — | Ball carrier |
| Complete pass | Passer, receiver | — |
| Incomplete pass | Passer | Target |
| Spike | — | Passer |

An attribution may be unknown. A play with an unknown required actor is still calculated and remains valid for team totals; it carries an `unresolved_identity` issue and keeps results provisional.

### Credits

| Observation | Player credits | Team credits |
| --- | --- | --- |
| Rush | Ball carrier: 1 rushing attempt and the rushing yards | 1 rushing attempt, rushing yards |
| Kneel-down | None | 1 rushing attempt and the rushing yards, charged to **Team** |
| Complete pass | Passer: 1 pass attempt, 1 completion, passing yards. Receiver: 1 reception, receiving yards equal to the passing yards | 1 pass attempt, 1 completion, passing yards counted **once** |
| Incomplete pass | Passer: 1 pass attempt. A target is recorded for review but earns no statistic | 1 pass attempt |
| Spike | None | 1 pass attempt, charged to **Team** |

- "Team" is a statistical line of its own, as in the NCAA box score: its attempts and yards are included in team totals but belong to no player.
- Team total offense is rushing yards plus passing yards. Receiving yards are never added to team offense.
- A play that starts a new series for the same team (rule 2 above) earns a first down, credited to the team as rushing or passing according to the observation.
- A touchdown from scrimmage also earns a first down, by the same category, when its series started 10 yards or more from the opponent's goal line. A touchdown in a series that started closer, and any safety, earns none.
- A play with an `unsupported_consequence` issue still credits its observed attempt, yards, and first down; the points themselves are not credited.
- A turnover on downs changes possession but is **not** counted as a team turnover; turnovers are fumbles lost and interceptions, which this profile does not support. Third- and fourth-down conversion totals are not part of this policy version.
- A credit belonging to an unknown player is kept as an unresolved player line for that team, never assigned to an invented player.

## Unsupported behavior

### Observations that cannot be recorded

The contracts reject these observations under this profile:

- kickoffs, punts, field goals, extra points, and two-point conversions;
- penalties;
- fumbles, recoveries, interceptions, and returns;
- sacks (under NCAA conventions they will count as rushing when supported);
- laterals and backward passes;
- tackles and other defensive contributions;
- timeouts, period transitions, clock management, and overtime.

### Consequences reported as issues

A supported observation may lead to a consequence this profile cannot calculate. The engine reports it and leaves the observation unchanged:

| Consequence | Issue |
| --- | --- |
| Dead-ball spot in the opponent's end zone (touchdown) | `unsupported_consequence` |
| Dead-ball spot in the offense's own end zone, offense responsible (safety) | `unsupported_consequence` |

Turnover on downs is **supported** and is not an issue.

Complete-game coverage is not claimed. See [getting started](../getting-started.md) for the slice this profile serves.

## Examples

### Series

The home team receives the ball at its own 25. The roster includes #7 (quarterback), #22 (running back), #81 and #85 (receivers). #33 is seen on the field but not identified.

| # | Before | Observation | After | Credits |
| --- | --- | --- | --- | --- |
| 1 | 1st & 10, own 25 | Rush, #22, +4 | 2nd & 6, own 29 | #22: 1 rush, 4 yards |
| 2 | 2nd & 6, own 29 | Complete pass, #7 to #81, +27 | 1st & 10, opponent 44 | #7: 1 of 1, 27 yards. #81: 1 reception, 27 yards. Team: 27 passing yards, 1 passing first down |
| 3 | 1st & 10, opponent 44 | Incomplete pass, #7, target #81 | 2nd & 10, opponent 44 | #7: 1 pass attempt |
| 4 | 2nd & 10, opponent 44 | Rush, unknown #33, −3 | 3rd & 13, opponent 47 | Unresolved #33: 1 rush, −3 yards. `unresolved_identity` issue |
| 5 | 3rd & 13, opponent 47 | Complete pass, #7 to #85, +9 | 4th & 4, opponent 38 | #7: 1 of 1, 9 yards. #85: 1 reception, 9 yards |
| 6 | 4th & 4, opponent 38 | Rush, #22, +2 | Away team: 1st & 10, own 36 | #22: 1 rush, 2 yards. Turnover on downs, not a team turnover |

Home team totals after the series:

| Total | Value |
| --- | --- |
| Rushing | 3 attempts, 3 yards (#22: 2 for 6; unresolved #33: 1 for −3) |
| Passing | 2 of 3, 36 yards (#7) |
| Receiving | #81: 1 for 27; #85: 1 for 9 |
| Total offense | 39 yards |
| First downs | 1 (passing) |
| Turnovers | 0 |
| Issues | 1 `unresolved_identity` |

### Conventions and edge cases

| Before | Observation | After | Rule illustrated |
| --- | --- | --- | --- |
| 1st & 10, own 45 | Rush, +10 | 1st & 10, opponent 45 | Crossing midfield |
| 2nd & 4, opponent 12 | Complete pass, +5 | 1st & goal, opponent 7 | New series with the goal line as line to gain |
| 1st & goal, opponent 7 | Rush, −3 | 2nd & goal, opponent 10 | A loss does not move a goal-to-go line to gain |
| Start of capture at opponent 7 | — | 1st & goal, opponent 7 | Starting context derives goal to go |
| 3rd & 2, own 20 | Kneel-down, −2 | 4th & 4, own 18 | Team: 1 rush, −2 yards; the quarterback is not charged |
| 2nd & 10, own 40 | Spike | 3rd & 10, own 40 | Team: 1 pass attempt; the passer is not charged |
| 4th & 1, own 30 | Incomplete pass | Other team: 1st & 10, opponent 30 | Turnover on downs re-expresses the spot |
| 4th & goal, opponent 2 | Rush, +1 | Other team: 1st & 10, own 1 | Turnover on downs inside the 10 |
| 1st & 10, opponent 20 | Rush, +20 | Not calculated | Touchdown: `unsupported_consequence`; 1 rushing first down (series started 20 yards out) |
| 1st & goal, opponent 8 | Complete pass, +8 | Not calculated | Touchdown: `unsupported_consequence`; no first down (series started 8 yards out) |
| 2nd & 12, own 3 | Rush, officials' spot in own end zone, −3 | Not calculated | Safety: `unsupported_consequence`; no first down |
| 2nd & 12, own 3 | Rush, stopped at own 1 then driven into the end zone, −2 | 3rd & 14, own 1 | Forward progress: the officials' spot is used, no safety |
