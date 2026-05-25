---
name: autoresearch-reason
description: Adversarial debate with blind judges to resolve critical marketing strategy dilemmas.
---
# Autoresearch: Debate a Strategy Decision (`/autoresearch:reason`)

## When to Use This Skill

Activate this skill when the user triggers `/autoresearch:reason` or selects "Debate a strategy call" from the submenu. Use this when the user faces a tough binary or strategic marketing decision and wants to run a balanced debate to weigh all pros, cons, and tradeoffs.

*Common strategy dilemmas*:
- "Broad targeting vs. Niche/Lookalike audiences?"
- "Video creative vs. Static image assets?"
- "Discount/Offer messaging vs. Pure value proposition copy?"
- "One long-form landing page vs. Segmented quiz funnels?"

---

## The Adversarial Debate Structure (8 Iterations)

The agent runs an internal 8-iteration adversarial debate:

- **Iterations 1-2 (Side A - The Advocate)**: Draft the strongest possible argument for Option A, using data benchmarks, psychological triggers, and efficiency metrics.
- **Iterations 3-4 (Side B - The Challenger)**: Draft the strongest possible counterargument for Option B, focusing on scaling limits, creative fatigue, and customer lifetime value.
- **Iterations 5-6 (Cross-Examination)**: Have both sides critique each other's weak points and assumptions.
- **Iterations 7-8 (The Blind Jury)**: Simulate three objective, "blind" marketing judges who evaluate the arguments purely on logic, evidence, and risk profiles.

---

## Output Verdict

1. **The Debate Log Summary**:
   - A concise summary of the core arguments for both Side A and Side B.
2. **Jury's Verdict**:
   - **Winner**: The option that was determined to be stronger.
   - **Score**: Win margin (e.g. "Judge 1: Side A, Judge 2: Side A, Judge 3: Side B. Winner: Option A (2-1)").
   - **Strategic Synthesis**: A blended approach recommendations (how to get the best of both options, e.g., "Start with Option A for quick traction, but build Option B assets to capture the next tier of scale").
