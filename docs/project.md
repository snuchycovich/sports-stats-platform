# Project and Scope

## Product scope

The product is designed for tackle American football and flag football. It must support the distinct rules, field dimensions, event types, and statistical policies of both disciplines without treating one as a minor variation of the other. The first pilot may focus on only one discipline, but the shared core must ultimately support verified results for both.

The architecture may later be extended to other sports. This is a possible evolution, not a requirement for the first deliveries: additional disciplines will be considered only after the football and flag-football workflows have been validated and their common abstractions are understood.

## Product problem

The initial motivation is to eliminate the paper-to-digital double entry still observed in some sports-statistics workflows. A concrete example reported by the project owner is the collection of game statistics on paper in Mexico's ONEFA league, followed by computer entry later in the week. This is a motivating field observation, not evidence that every ONEFA organization or competition works in the same way. The product must test whether avoiding repeated entry, delayed publication, transcription errors, and difficult corrections creates enough value for users and buyers to change their workflow.

The project also aims to make structured statistics collection accessible to leagues, clubs, and operators that do not currently use the products already available on the market, particularly in smaller leagues or lower divisions. Possible barriers include limited awareness of existing tools, insufficient financial or operational resources, inadequate local support, and pricing that may not fit smaller organizations. These explanations remain hypotheses to validate through interviews, field observation, and commercial testing; the absence of adoption must not be attributed to price or any single cause without evidence.

The proposed value is simple: record each play once, preserve the observations and corrections, and produce trustworthy statistics without waiting for a second entry pass. The capture workflow must retain the practical strengths of paper—speed, resilience, ease of use, and independence from network coverage—while lowering the practical barriers to adopting digital statistics collection.

## Users and value

The primary user is a game statistician or capture operator. Potential users and buyers include statistics providers, clubs, universities, leagues, tournament organizers, and smaller organizations that currently rely on paper or basic manual tools. Coaches and media may consume detailed or live views; players and spectators mainly consume published results. These roles, their unmet needs, their ability to adopt the product, and their willingness to pay remain [hypotheses to validate](personas.md).

## Delivery stages

| Stage | Included | Completion signal |
| --- | --- | --- |
| Prototype | Prepare one game, capture a limited rush/pass subset offline, correct a play, synchronize, and rebuild statistics | The end-to-end slice works without lost commands or duplicate effects |
| Field pilot | Cover every event required by one selected ruleset, provide the Mexican statistics report and public views, and operate on target devices | A complete game can be captured, reviewed, and exported reliably |
| Second discipline | Adapt rules and capture for either tackle or flag football, whichever was not piloted first | The same core supports verified results for both disciplines |
| Later evolution | Voice assistance, video links or analysis, native apps, and additional sports | Introduced only after evidence and explicit decisions |

The prototype is not an official full-game statistics product. A rush/pass subset does not cover penalties, turnovers, kicking, conversions, clock events, or every rule required by a field pilot.

## Product boundaries and risks

Live capture must remain faster than navigating a detailed form. It records every play with the smallest useful fact set and allows details to be completed during a stoppage or in Review Mode. The operator may end capture with uncertain plays: the match remains provisional and displays their unique count and reasons until review. Tablet landscape is the primary layout; phone capture is a complete fallback, while desktop emphasizes review and assisted post-game transcription. A generated paper sheet remains the operational fallback for device or battery failure.

The first delivery excludes full multisport support, simultaneous multi-operator editing, native applications, durable audio storage, CSV import, OCR, and video analysis. Voice may later transcribe short utterances over the network, propose structured data, and require human approval. A later OCR option may only create drafts requiring human validation.

Key risks are unvalidated demand, capture latency, missed plays, browser storage behavior, incomplete rules, inconsistent observations, sensitive player or media data, and adoption during live games. Corrections must rebuild dependent results and report contradictory later observations; recalculation must never silently rewrite facts to make them fit.

## Open product decisions

Before a field pilot, select the pilot user and exact sports rules, obtain real capture sheets and expected reports, choose the statistical policy, define public versus private data, verify applicable privacy obligations, and test an offer with a buyer. Pricing, brand, service objectives, and hosting are not decided.
