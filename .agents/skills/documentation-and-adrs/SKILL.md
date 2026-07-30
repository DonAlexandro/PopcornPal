---
name: documentation-and-adrs
description: Records decisions and documentation. Use when making architectural decisions, changing public APIs, shipping features, or when you need to record context that future engineers and agents will need to understand the codebase.
---

# Documentation and ADRs

## Overview

Document decisions, not just code. The most valuable documentation captures the _why_ — the context, constraints, and trade-offs that led to a decision. Code shows _what_ was built; documentation explains _why it was built this way_ and _what alternatives were considered_. This context is essential for future humans and agents working in the codebase.

## Writing Style (Human-First, No Detail Loss)

Use short paragraphs. Target 1-3 sentences per paragraph.

Use direct, cut-to-the-chase sentences. Put key point first, then constraints and trade-offs.

Preserve all critical details. Do not remove rationale, assumptions, risks, alternatives, constraints, or operational caveats.

Prefer structure over verbosity:

- One idea per paragraph
- Use bullets for lists, decisions, and acceptance checks
- Keep examples small but complete
- Put dense reference material in tables or checklists

When compressing text, never compress meaning:

- Keep exact names for APIs, files, commands, error messages, and statuses
- Keep ordering when order matters (especially runbooks and migrations)
- Keep irreversible-action warnings explicit
- Keep links and cross-references to related ADRs/specs

Quality bar for every doc update:

- Easy to skim in under 60 seconds
- Enough depth to execute without tribal knowledge
- No fluff, no repeated statements
- No loss of technically important information

## When to Use

- Making a significant architectural decision
- Choosing between competing approaches
- Adding or changing a public API
- Shipping a feature that changes user-facing behavior
- Onboarding new team members (or agents) to the project
- When you find yourself explaining the same thing repeatedly

**When NOT to use:** Don't document obvious code. Don't add comments that restate what the code already says. Don't write docs for throwaway prototypes.

## Solution Architecture Document

A Solution Architecture Document (SAD) is a detailed blueprint that outlines how a technical system or software application will be built to solve a specific business problem. It bridges the gap between business goals and technical execution by detailing system components, data flows, and technologies.

For detailed SAD guidance, see [references/solution.md](references/solution.md).

## Architecture Decision Records (ADRs)

An Architectural Decision (AD) is a justified design choice that addresses a functional or non-functional requirement that is architecturally significant.

An Architecturally Significant Requirement (ASR) is a requirement that has a measurable effect on the architecture and quality of a software and/or hardware system. An Architectural Decision Record (ADR) captures a single AD and its rationale; Put it simply, ADR can help you understand the reasons for a chosen architectural decision, along with its trade-offs and consequences.

The collection of ADRs created and maintained in a project constitute its decision log. All these are within the topic of Architectural Knowledge Management (AKM), but ADR usage can be extended to design and other decisions (“any decision record”).

For detailed guidance on ADRs, see [references/decision.md](references/decision.md).

## Inline Documentation

For detailed guidance on inline documentation, see [references/inline-documentation.md](references/inline-documentation.md).

## API Documentation

For public APIs (REST, GraphQL, library interfaces):

Write API docs for fast scanning:

- Start with one-sentence behavior summary
- List required inputs and defaults
- List outputs and side effects
- List failure modes and error types
- Include one minimal real usage example

For detailed API documentation examples, see [references/api-documentation.md](references/api-documentation.md).

## Documentation for Agents

Special consideration for AI agent context:

- **CLAUDE.md / rules files** — Document project conventions so agents follow them
- **Spec files** — Keep specs updated so agents build the right thing
- **ADRs** — Help agents understand why past decisions were made (prevents re-deciding)
- **Inline gotchas** — Prevent agents from falling into known traps

## Common Rationalizations

| Rationalization                            | Reality                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| "The code is self-documenting"             | Code shows what. It doesn't show why, what alternatives were rejected, or what constraints apply.     |
| "We'll write docs when the API stabilizes" | APIs stabilize faster when you document them. The doc is the first test of the design.                |
| "Nobody reads docs"                        | Agents do. Future engineers do. Your 3-months-later self does.                                        |
| "ADRs are overhead"                        | A 10-minute ADR prevents a 2-hour debate about the same decision six months later.                    |
| "Comments get outdated"                    | Comments on _why_ are stable. Comments on _what_ get outdated — that's why you only write the former. |

## Red Flags

- Architectural decisions with no written rationale
- Public APIs with no documentation or types
- Commented-out code instead of deletion
- TODO comments that have been there for weeks
- No ADRs in a project with significant architectural choices
- Documentation that restates the code instead of explaining intent

## Verification

After documenting:

- [ ] ADRs exist for all significant architectural decisions
- [ ] API functions have parameter and return type documentation
- [ ] Known gotchas are documented inline where they matter
- [ ] No commented-out code remains
- [ ] Rules files (CLAUDE.md etc.) are current and accurate
- [ ] Paragraphs are short and skimmable (1-3 sentences)
- [ ] Sentences are direct and cut to the chase
- [ ] No important details were removed during simplification
- [ ] Ordered procedures preserve exact execution order
