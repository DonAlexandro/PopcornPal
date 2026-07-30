# Architecture Decision Records (ADRs)

ADRs capture the reasoning behind significant technical decisions. They are the highest-value documentation you can write.

Write ADRs for humans first: brief sections, clear headings, direct language, full context preserved.

## When to Write an ADR

- Choosing a framework, library, or major dependency
- Designing a data model or database schema
- Selecting an authentication strategy
- Deciding on an API architecture (REST vs. GraphQL vs. tRPC)
- Choosing between build tools, hosting platforms, or infrastructure
- Any decision that would be expensive to reverse

## ADR Template

Find ADR template in `docs/decisions/template.md`.

Store ADRs in `docs/decisions/` with sequential numbering:

```text
docs/
├── decisions/
│   ├── template.md         # Team's ADR template
│   ├── 0001-use-postgresql.md
│   ├── 0002-caching-strategy.md
│   ├── 0003-mongodb-user-profiles.md
│   └── 0020-deprecate-mongodb.md
```

## ADR Lifecycle

```text
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **Don't delete old ADRs.** They capture historical context.
- When a decision changes, write a new ADR that references and supersedes the old one.
- Move deprecated and superseded ADRs to `docs/decisions/deprecated`.
