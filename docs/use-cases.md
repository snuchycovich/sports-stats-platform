# Priority Use Cases

## UC-01 — Prepare a game

**Primary actor:** Game capture operator.

**Preconditions:** The game, teams, roster, ruleset, and statistical policy exist; the operator is authorized and initially online.

**Nominal flow:** Select the game, download its capture package, verify required configuration, and mark the device ready for offline capture.

**Important errors or variants:** Missing roster data may be explicitly marked for review. Missing rules or storage failure blocks readiness. A stale package requires refresh or an explicit conflict decision.

**Acceptance criteria:** The required package survives reload without network access; its game revision and rule versions are visible; missing blocking data prevents a ready status.

## UC-02 — Record a play

**Primary actor:** Game capture operator.

**Preconditions:** A prepared game is open and local storage is available.

**Nominal flow:** From the persistent Live Capture screen, select a frequent play action, enter the smallest useful fact set, and save. The application atomically stores the play and its command in the local outbox, rebuilds provisional statistics, and prepares the next context.

**Important errors or variants:** Unknown players or values are marked explicitly for later review. An unresolved jersey number is accepted. Invalid facts and local write failures are visible. Network absence does not block touch or keyboard capture. Voice is outside the first slice.

**Acceptance criteria:** A minimal play and command survive reload; a common play requires no page change or nested menu; incomplete plays remain visible; the UI distinguishes completeness, review, and synchronization states; the provisional result uses the configured versions.

## UC-03 — Correct an observation

**Primary actor:** Game capture operator or authorized reviewer.

**Preconditions:** The play exists and its current revision is known.

**Nominal flow:** Open the play, enter a correction and reason, confirm against the expected revision, retain the prior revision, and rebuild the game from the corrected ordered log.

**Important errors or variants:** A stale revision creates a conflict and preserves the local proposal. A changed possession or context may contradict later observations; those plays are flagged instead of silently changed.

**Acceptance criteria:** History identifies the previous and current revisions; derived statistics match the current log; every downstream contradiction is explicit and blocks final validation until resolved.

## UC-04 — Resume after disconnection

**Primary actor:** Game capture operator.

**Preconditions:** One or more commands are pending locally.

**Nominal flow:** On reconnection, foreground resume, or explicit retry, send commands in causal order. The server validates each command transactionally and returns its durable result; the client advances its synchronization cursor.

**Important errors or variants:** Timeout after server commit causes a safe retry. Reusing a command ID with different content is rejected. Version conflicts remain visible for manual resolution.

**Acceptance criteria:** Retrying the same command has no additional effect; no acknowledged command remains pending; rejected or conflicting commands retain their local proposal and explanation.

## UC-05 — View statistics

**Primary actor:** Operator, reviewer, coach, media user, or spectator according to access.

**Preconditions:** A game projection exists.

**Nominal flow:** Open the game view and read score, team, and player statistics derived from the current play revision.

**Important errors or variants:** Offline operators see a provisional local projection. Public users see only the publication projection. Stale projections display their status rather than appearing current.

**Acceptance criteria:** The view identifies provisional or validated status; the same inputs and versions produce the same totals in browser and server; public access exposes no private capture data.

## UC-06 — End game capture

**Primary actor:** Game capture operator.

**Preconditions:** The live game has ended or the operator has authority to stop capture.

**Nominal flow:** Open the closing summary, review the unique number of uncertain plays and their reason breakdown, confirm the end of capture, and leave the match available in Review Mode.

**Important errors or variants:** Plays may be incomplete, contradictory, pending, or in conflict. A single play may contribute several reasons but counts once in the unique total. Closing while offline does not discard pending commands.

**Acceptance criteria:** Capture can close with zero or more uncertain plays; the displayed unique count matches the affected play IDs; statistics and reports remain provisional when issues exist; closing capture neither validates results nor requires reopening for ordinary review.

## UC-07 — Complete deferred details

**Primary actor:** Game capture operator or authorized reviewer.

**Preconditions:** A minimal or `needs_details` play exists in the ordered log.

**Nominal flow:** Open Review Mode, inspect the play and surrounding context, resolve players and segments, add policy-required attribution, and save a new revision using the same stable play ID.

**Important errors or variants:** The reviewer may retain an explicit unknown when policy permits it. A detail that changes game context triggers downstream recalculation and inconsistency reporting. A stale revision becomes a conflict.

**Acceptance criteria:** Live and review views show the same observation; the original revision remains auditable; completeness and review status update independently; unresolved details remain counted and visible but never prevent ending capture or remove the play.

## UC-08 — Validate results

**Primary actor:** Lead statistician or authorized reviewer.

**Preconditions:** Capture is closed and the reviewer can validate results under the selected statistical policy.

**Nominal flow:** Review the ordered log, uncertainty summary, ruleset, statistical policy, and totals; resolve mandatory issues; then mark results validated and publish the approved projection.

**Important errors or variants:** The policy may allow explicitly documented unknowns while requiring conflicts, inconsistent consequences, and pending delivery to be resolved. A later correction requires authorized reopening of validated results and an audit entry.

**Acceptance criteria:** Validation applies the configured policy rather than the capture-closing rule; the published result records source game revision, ruleset, statistical policy, and engine version; reopening never erases the earlier audit trail.

## UC-09 — Switch to paper fallback

**Primary actor:** Game capture operator.

**Preconditions:** A prepared, printable game sheet is available and digital capture is no longer reliable.

**Nominal flow:** Record the last reliable digital sequence, continue on the generated sheet with compact event codes, and preserve the sheets for later reconciliation.

**Important errors or variants:** Battery, device, or local-storage failure may prevent recording the switchover digitally. The operator then notes the last known digital play on paper. Existing pending commands remain untouched.

**Acceptance criteria:** The prepared sheet identifies the match, teams, rosters, and play order; the reconciliation point is recoverable; the fallback does not imply that handwritten observations have already synchronized.

## UC-10 — Transcribe a paper game

**Primary actor:** Game capture operator or reviewer using a desktop.

**Preconditions:** The paper sheet and, when available, match video can be inspected; the game and roster exist.

**Nominal flow:** Enter observations sequentially with keyboard shortcuts, reuse safe previous values, attach optional video timestamps, review each series, and submit the resulting commands through the ordinary synchronization path.

**Important errors or variants:** Illegible or missing values are marked unknown. Overlap with existing digital plays creates reconciliation issues rather than duplicates. CSV and OCR are not part of the first pilot.

**Acceptance criteria:** Every paper line maps to a structured play or an explicit unresolved issue; stable ordering is preserved; video is supporting evidence rather than a second source of truth; all transcribed plays pass normal validation and review.

## UC-11 — Generate the Mexican statistics report

**Primary actor:** Lead statistician or authorized reviewer.

**Preconditions:** A current game projection exists and a team perspective is selected.

**Nominal flow:** Generate the on-screen or PDF report from the canonical projection, inspect its provisional or validated status, and export it.

**Important errors or variants:** Incomplete coverage or unresolved issues are displayed with the unique uncertain-play count. Ambiguous legacy fields remain explicitly unverified. Generating the opponent report changes perspective without duplicating observations.

**Acceptance criteria:** The report records its source game revision and calculation versions; corrections regenerate derived totals; report cells are never accepted as source facts; validated reference games match independently approved totals.
