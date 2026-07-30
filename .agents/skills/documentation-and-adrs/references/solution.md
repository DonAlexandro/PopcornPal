# Solution Architecture Document (SAD) Reference

Use this reference to frame every final SAD with five sections: WHO, WHAT, WHEN, WHY, HOW.

Location rule is global and mandatory: all SADs live in docs/solutions/. Do not add a WHERE section to final SAD documents.

Status for this reference:

- Included now: WHO, WHAT, WHEN, WHY
- HOW uses this guidance style and can later align with arc42 depth

## WHO

State audience explicitly.

- Primary readers: engineers implementing or modifying solution
- Secondary readers: reviewers, QA, DevOps, support, onboarding engineers
- Optional direct callout line: "This document is for new engineers on <project-name>."

Why this matters:

- Sets expected depth and vocabulary
- Prevents docs that are too shallow or too internal

## WHAT

Define purpose in one clear sentence.

Use pattern:

- "This document describes <solution scope> for <problem> in <environment/context>."

Guardrail:

- If content does not support declared WHAT, move it to separate doc

## WHEN

Capture document timing and freshness.

- Created date
- Last reviewed date
- Last updated date
- Optional next review date for long-lived architecture

Notes:

- Git history helps, but explicit dates improve quick trust checks

## WHY

Explain purpose and expected takeaway up front.

- Summarize problem pressure and decision intent
- State what reader should understand after reading
- Include key constraints and trade-offs

Validation check:

- Re-read summary after writing
- Confirm body fulfills stated WHY
- Revise intro if mismatch exists

## HOW

### HOW Structure: Beginning, Middle, End

- Beginning: frame implementation problem, assumptions, constraints
- Middle: explain approach, sequence, trade-offs, evidence
- End: summarize implementation takeaway, limits, next actions

Why this matters:

- Prevents HOW from becoming wall of text
- Gives reader execution roadmap
- Makes key implementation decisions easier to extract

### HOW Redundancy Rule (Intentional)

Use selective redundancy inside HOW:

- Introduce key implementation point in short opener
- Expand with detail and context in body
- Re-state actionable takeaway in HOW conclusion

Constraint:

- Repeat signal, not noise; avoid copy-paste paragraphs

### HOW Quality Parameters

Good HOW writing balances three parameters:

- Completeness
- Accuracy
- Clarity

Trade-off rule:

- Pushing one parameter too far can damage others
- Over-complete HOW can become hard to read
- Over-compressed HOW can hide critical side effects

Target state:

- A good HOW section does its intended job for its audience

### Audience-First Filter for HOW

Optimize HOW for reader needs, not maximum detail volume.

- Often less is more
- Keep only details needed to implement, review, or operate solution

Exclude from HOW unless required by stated HOW job:

- Deep API reference catalogs
- Broad design-history narrative
- Unrelated implementation internals

### HOW Voice and Recipient

Write HOW to be read and used, not to fill page.

Check after drafting:

- If phrasing sounds unnatural in live conversation, rewrite
- Prefer direct, conversational wording over formal boilerplate

Recipient rule:

- Write to one concrete reader persona, not abstract crowd
- Single-reader targeting reduces vague generalities and improves actionability

Communication rule:

- Keep individuality and clear voice
- Prioritize understanding and execution over formality

### HOW Red Flags

Treat these beliefs as error signs in HOW writing:

- "Longer document means more significance"
- "Restrained formal style is always better than conversational style"
- "Sophisticated words create better impression"
- "Point of view needs long detailed text"
- "Presentation is as important as content"

Correction:

- In HOW, usefulness beats size, jargon, and surface polish
- Prioritize actionable clarity for target reader

## SAD Template

Find SAD template here: docs/solutions/template.md

## SAD Location Rule

Store SADs in docs/solutions/ with sequential numbering.

Required structure:

```text
docs/
├── solutions/
│   ├── template.md         # Team's SAD template
│   ├── 0001-use-postgresql.md
│   ├── 0002-caching-strategy.md
│   ├── 0003-mongodb-user-profiles.md
│   └── 0020-deprecate-mongodb.md
```

Naming rules:

- Prefix with zero-padded sequence number
- Use concise kebab-case slug after number
- Keep one decision/topic per file

Final SAD constraint:

- Do not include a WHERE section inside the SAD body
