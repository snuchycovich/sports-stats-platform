# First Development Slice

## Goal

Build one vertical proof: prepare a game, record a small rush/pass subset rapidly without a network, complete or correct one play in Review Mode, synchronize commands, and verify the same duplicate-free statistics in browser and server. This slice proves architecture and workflow; it is not a complete game-capture product or Mexican report implementation.

## Blocking decisions before implementation

1. Select one concrete demonstration ruleset and statistical policy for the supported rush/pass examples. Label both as prototype profiles, not official coverage.
2. Define the minimum reference game: teams, roster, starting context, supported observations, one correction, and independently reviewed expected totals.
3. Choose runtime schemas and the server framework for the slice. NestJS is recommended but still requires an explicit implementation decision.
4. Choose the PostgreSQL access approach after a small spike proves transactions, migrations, JSONB mapping, and optimistic updates. The ORM is not otherwise blocking product documentation.

Authentication, hosting, SSE, season aggregation, voice, video, native applications, complete rules, and simultaneous operators can wait unless the demonstration environment requires a minimal substitute.

## Ordered implementation

### 1. Establish the monorepo and contracts

Create the planned web, API, domain, contracts, and test-fixtures packages. Enable strict TypeScript and boundary rules. Define runtime-validated command and play payload versions separately from play revisions.

**Expected result:** Browser and server import the same domain types, engine, schemas, and reference fixtures without framework dependencies entering the domain package.

### 2. Implement the pure domain slice

Support only the selected rush/pass observations, ordered calculation, the chosen prototype rules, player/team attribution, and explicit issues. Add correction by replacing a current play revision while retaining the original in fixtures.

**Expected result:** The reference game produces identical state and statistics in both runtimes. A correction rebuilds totals and reports any contradictory downstream context.

### 3. Prepare and capture locally

Implement game-package download and a persistent Live Capture screen. Keep context, frequent rush/pass actions, yards, recent players, and recent plays visible. Support large touch targets, keyboard shortcuts, explicit unknowns, and separate completeness, review, and synchronization states. In one Dexie transaction, store each local play and its outbox command. Rebuild provisional results locally.

**Expected result:** After preparation, a common supported play can be saved without changing page or opening nested menus. The flow works offline and survives reload. Failed local writes are visible and never reported as saved.

### 4. Synchronize idempotently

Implement transactional command handling, durable receipts, retained play revisions, optimistic preconditions, and a canonical match projection in PostgreSQL. Send pending commands in causal order and recover from a cursor or snapshot.

**Expected result:** A simulated timeout after commit followed by retry creates no duplicate play, revision, receipt, or statistic. A reused ID with different content is rejected, and a stale revision becomes a visible conflict.

### 5. Add Review Mode and verify correction

Record several minimal plays offline, leave at least one uncertain, close capture after confirming the uncertainty summary, enrich or correct the play through Review Mode without changing its stable ID, reconnect, retry at least one acknowledged command, and compare browser and server projections.

**Expected result:** Closing capture reports the correct unique uncertain-play count without presenting results as validated. The ordered current log, audit history, source revisions, and totals agree. Completeness, review, capture, result, pending, and conflict states remain independent and explicit; no command or observation is silently discarded.

## Milestones after the first slice

1. Expand the selected pilot ruleset to offense, special teams, turnovers, penalties, scoring, first downs, and defense using independently reviewed reference games.
2. Generate `MexicanStatSheetProjection` on screen and as PDF, then validate every category and ambiguous legacy label with a Mexican statistician.
3. Generate the prepared paper fallback sheet and implement desktop assisted transcription with optional video timestamps.
4. Run a failure drill that switches from digital capture to paper and reconstructs the complete ordered match afterward.

CSV import and photo OCR remain deferred. A future OCR workflow may create only human-validated drafts.

## Essential automated checks

- Pure engine fixtures for initial calculation, correction, ordering, attribution, and inconsistent consequences.
- Contract tests proving runtime rejection of invalid or unsupported payload versions.
- IndexedDB transaction and reload tests for play/outbox atomicity.
- API/database integration tests for idempotent retry, mismatched reuse, optimistic conflict, and rollback.
- Playwright offline/reconnect scenario covering preparation through synchronized verification.
- Responsive and keyboard tests for tablet landscape, phone portrait, and desktop layouts.
- Timed usability sessions measuring median and worst-case entry time, missed plays, deferred details, and corrections.
- Capture-closing tests with zero, one, and multiple uncertain plays, including one play carrying several issue reasons.

The slice is complete only when these checks pass on tablet, phone, and desktop target profiles and the independently reviewed reference totals match. Pilot readiness additionally requires full selected-ruleset coverage, validated Mexican-report parity, and a successful paper-fallback drill.
