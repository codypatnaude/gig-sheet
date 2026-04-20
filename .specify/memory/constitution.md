<!-- SYNC IMPACT REPORT
Version change: (new) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (I–V)
  - Tech Stack Constraints
  - Development Workflow & Quality Gates
  - Governance
Templates requiring updates:
  ✅ .specify/memory/constitution.md (this file)
  ⚠  .specify/templates/plan-template.md — review for scroll-sync scrutiny gate
  ⚠  .specify/templates/spec-template.md — review for test infrastructure section
  ⚠  .specify/templates/tasks-template.md — review for test-first task ordering
Follow-up TODOs: None. All fields resolved.
-->

# GigSheet Constitution

## Core Principles

### I. Testability First (NON-NEGOTIABLE)

Testing infrastructure MUST be established before or alongside feature work — never after.
This is not optional and is not deferred to "later in the project."

Rules:
- Test tooling, test utilities, and at least one passing test MUST exist before a feature is
  considered in-progress.
- Every new module or subsystem MUST ship with tests covering its primary contract.
- Integration tests covering Socket.IO event flows (client → server → broadcast) are REQUIRED
  for any real-time feature, not just unit tests.
- The agent MUST be able to run the test suite (`npm test` or equivalent) and verify green
  before marking any task complete.
- Test coverage for scroll sync (see Principle II) MUST include multi-client simulation.

Rationale: A local-network app with real-time sync across devices is uniquely difficult to
debug after the fact. If the agent cannot run tests, it cannot verify correctness. Deferred
testing creates compounding risk that is disproportionate for a small, high-trust codebase.

### II. Synced Scroll Is Sacred (NON-NEGOTIABLE)

Simultaneous auto-scroll synchronization across all connected devices is the core
differentiating feature of GigSheet. It MUST NEVER silently break.

Rules:
- Any code change touching scroll position, auto-scroll timing, Socket.IO scroll events
  (`scroll_update`, `scroll_synced`, `scroll_stopped`), or the `ScrollState` data structure
  REQUIRES explicit test coverage before the change is merged.
- Scroll sync behavior MUST be covered by integration tests that simulate at least two
  clients: one broadcasting, one receiving.
- Regression tests for scroll drift (positional delta < 50px after 5 minutes) MUST be
  maintained once established.
- Scroll-related Socket.IO events MUST be treated as part of the public contract — changes
  to their payload shape require a version note and deliberate migration.
- In any PR or task touching scroll logic, the reviewer (or agent) MUST explicitly confirm:
  "Scroll sync verified: [test name / manual verification]."

Rationale: The synced scroll feature is what makes GigSheet different from a shared Google
Doc. A band mid-rehearsal cannot debug a drifting scroll. Losing this feature silently —
through a refactor, a dependency update, or an untested edge case — is the highest-risk
failure mode in the project.

### III. Local-First, Zero External Dependencies

GigSheet MUST run entirely on a local WiFi network with no internet connectivity required
at runtime.

Rules:
- No runtime calls to external APIs, CDNs, or third-party services.
- All assets (JS bundles, fonts, icons) MUST be self-hosted and served by the local Express
  server.
- The SQLite database is the sole persistence layer. No remote databases, no sync services.
- The PWA service worker MUST cache the full app shell so the UI remains functional during
  brief network drops.
- Dependencies added to the project MUST be evaluated for whether they introduce any
  external runtime calls.

Rationale: The app is designed for rehearsal rooms and stages where internet access is
unreliable or absent. Any external dependency at runtime is an availability risk that
violates the core use case.

### IV. Readability at Arm's Length

All user-facing content in Song View MUST be legible at approximately 60cm (2 feet) on a
standard smartphone screen.

Rules:
- Minimum font size for chart content (JetBrains Mono): 14px on mobile, 16px on tablet.
- Minimum font size for UI labels and metadata: 13px.
- Minimum touch target size: 44×44px (iOS HIG).
- Color contrast ratios MUST meet WCAG AA for all text on background combinations
  (4.5:1 for normal text, 3:1 for large text).
- Any UI change to Song View or the setlist MUST be manually verified on a 375px-wide
  viewport before merging.

Rationale: GigSheet is used in dim rehearsal rooms, on music stands, and on stages.
A chart that requires squinting is a chart that disrupts the band.

### V. Simplicity Over Speculation

Code MUST solve the current requirement. Abstractions, helpers, and generalization are
only introduced when there are at least two concrete uses.

Rules:
- No premature abstraction. Three similar lines of code are acceptable; a premature
  utility function is not.
- No feature flags, backwards-compatibility shims, or speculative configurability for
  MVP features.
- No error handling for scenarios that cannot occur given the architecture (e.g., multi-
  tenant auth on a single-band server).
- Future-scope items listed in the PRD (audio playback, PDF import, native apps) MUST NOT
  influence current implementation decisions.
- YAGNI: You Aren't Gonna Need It.

Rationale: GigSheet is a small, trusted-network app with a single band as its user. The
blast radius of over-engineering is high relative to the team size and scope.

---

## Tech Stack Constraints

These are fixed for MVP. Deviations require explicit justification and constitution amendment.

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | React 18 + TypeScript | Vite as build tool |
| Real-time client | Socket.IO Client | Matches server version |
| Backend runtime | Node.js LTS | Current LTS at time of init |
| HTTP server | Express | Serves both API and static frontend build |
| WebSocket server | Socket.IO | Single namespace, single room |
| Database | SQLite via better-sqlite3 | Synchronous driver; no ORM |
| Host machine | Mac Mini on local WiFi | PM2 or launchd for process management |
| App delivery | PWA (service worker) | No native app; no app store |
| DNS/discovery | mDNS (`gigsheet.local`) + IP fallback | No external DNS |

TypeScript MUST be used in both frontend and backend. Untyped `any` is prohibited except
where third-party types are unavailable and must be annotated with a `// eslint-disable`
comment explaining why.

---

## Development Workflow & Quality Gates

### Task Ordering

1. Test infrastructure is set up first (test runner configured, first test passing).
2. Shared types and Socket.IO event contracts are defined before implementation.
3. Server-side event handlers are implemented with integration tests before the client
   connects to them.
4. UI components are implemented after data contracts are stable.

### Quality Gates (per task/PR)

- [ ] `npm test` passes with no failures.
- [ ] If scroll logic was touched: scroll sync test explicitly confirmed.
- [ ] TypeScript compiles with no errors (`tsc --noEmit`).
- [ ] No `any` types introduced without justification comment.
- [ ] UI changes verified at 375px viewport width.
- [ ] No new external runtime dependencies introduced (or explicitly justified).

### Scroll Sync Change Checklist

Any change touching `scroll_update`, `scroll_synced`, `scroll_stopped`, `ScrollState`,
auto-scroll timing, or scroll position broadcasting MUST:

1. Include or update an integration test simulating two connected clients.
2. Verify scroll delta stays < 50px after 60 seconds of continuous sync.
3. Confirm reconnect recovery: a client that drops and rejoins snaps to current position.
4. Be noted explicitly in the commit message: `[scroll-sync]`.

---

## Governance

- This constitution supersedes all other development practices, patterns, or preferences
  unless explicitly noted as exceptions within the constitution itself.
- Principles I (Testability First) and II (Synced Scroll Is Sacred) are **non-negotiable**.
  They cannot be suspended for timeline reasons. If timeline pressure arises, scope is cut
  before these principles are relaxed.
- Amendments to any other principle require: (1) a written rationale, (2) an updated
  version number per semantic versioning, and (3) an updated `Last Amended` date.
- Version policy:
  - MAJOR: Removal or redefinition of a non-negotiable principle, or removal of a tech
    stack constraint.
  - MINOR: New principle added, new section added, material expansion of guidance.
  - PATCH: Clarifications, wording, typo fixes, non-semantic refinements.
- All spec, plan, and task artifacts produced by spec-kit agents MUST be checked against
  this constitution before acceptance. Non-compliant artifacts are rejected and revised.
- The agent MUST re-read this file at the start of any `/speckit.*` command execution.

**Version**: 1.0.0 | **Ratified**: 2026-04-20 | **Last Amended**: 2026-04-20
