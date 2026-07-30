---
name: remeda
description: >
  Remeda usage conventions and examples for this repository. Extend this skill
  with additional Remeda patterns over time.
---

# Remeda Skill

## Purpose

Central place for repository conventions on using Remeda utilities.

## Current Rule: Random Picks from Arrays

When selecting random items from an array, use:

`https://remedajs.com/docs/#sample`

Do not implement random selection with `Math.random`, manual index math, or custom shuffle helpers when `sample` covers the need.

## Why

- Keeps behavior consistent across the codebase.
- Preserves strong typing (including tuples and literals).
- Supports both random subset and single-item selection patterns.

## Preferred Usage

### Random subset

```ts
import { sample } from "remeda";

const picks = sample(array, sampleSize);
```

### Single random item

```ts
import { sample } from "remeda";

const item = sample(array, 1)[0]; // undefined when array is empty
```

### Data-last form

```ts
import { sample } from "remeda";

const picks = sample(sampleSize)(array);
```

## Examples

```ts
sample(["hello", "world"], 1); // => ["hello"] // typed string[]
sample(["hello", "world"] as const, 1); // => ["world"] // typed ["hello" | "world"]

sample(1)(["hello", "world"]); // => ["hello"] // typed string[]
sample(1)(["hello", "world"] as const); // => ["world"] // typed ["hello" | "world"]
```

## Notes

- Result keeps input order for selected items.
- If shuffled output is needed, apply `shuffle` after `sample`.
