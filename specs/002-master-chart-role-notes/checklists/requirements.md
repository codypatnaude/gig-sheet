# Specification Quality Checklist: Unified Master Chart & Role Notes

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-05-31
**Feature**: [spec.md](../spec.md)

## Content Quality

- [ ] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [ ] No implementation details leak into specification
- [x] Constitution Principle II [scroll-sync] requirements explicitly addressed

## Notes

**FAIL: No implementation details (Content Quality)**
The spec contains implementation-level details that should not appear in a requirements specification:
- FR-001 names specific database field identifiers: `chart_guitar`, `chart_bass`, `chart_drums`, `chart_vocals`, `chart_keys`, `chart_other`
- FR-017 names specific Socket.IO event names: `scroll_update`, `scroll_synced`, `scroll_stopped`
- FR-004 specifies "zero-based master-chart line index" — a data structure implementation choice
- Multiple FRs reference pixel measurements (50px) as scroll-sync tolerance — this is an implementation/rendering detail

**FAIL: Written for non-technical stakeholders (Content Quality)**
Same issues as above. A non-technical stakeholder (e.g. a band manager reviewing the spec) would not recognize Socket.IO event names or database field naming conventions as meaningful. The user stories themselves are well-written for non-technical readers, but the Functional Requirements section introduces technical terminology without need.

**FAIL: No implementation details leak into specification (Feature Readiness)**
This is the same issue surfaced from a feature-readiness angle. The FR section (FR-001, FR-004, FR-017) references concrete data model field names and event protocol names. These belong in a technical design document or the plan/tasks layer, not in the requirements specification.

**Recommended actions before proceeding to planning:**
1. In FR-001, replace named field identifiers with a functional description: "A song MUST have exactly one chart field shared across all roles, replacing the previous per-role chart fields."
2. In FR-017, remove the event name enumeration or move it to a footnote/appendix referencing spec 001's contract documents.
3. In FR-004, replace "zero-based master-chart line index" with "a reference identifying which line of the master chart the note is anchored to."
4. Retain pixel tolerance (50px) in SC-001 and FR-019 — this is a measurable user-visible outcome, not a code-level detail, and is acceptable in success criteria.
