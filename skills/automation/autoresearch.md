# Autoresearch (Autonomous Improvement Loop)

## When to Use This Skill

Activate this skill when the user wants to autonomously generate, test, and iterate on marketing hypotheses. This is the **Modify → Verify → Keep/Discard → Repeat** loop applied to digital marketing.

Use this for tasks like:
- Generating 50 headline hypotheses, scoring them against the ICP context, and keeping the top 5
- Iterating on ad copy variants and checking them against character limits or ad strength rules
- Brainstorming A/B test concepts and evaluating their statistical viability
- Running an overnight loop to optimize landing page structures

Read `product-marketing.md` first to understand the context against which you are scoring or generating ideas.

---

## The Autoresearch Loop

When running an autoresearch task, follow this strict loop. Do not stop until the goal is reached or the user interrupts.

### 1. Modify (Generate)
Generate a batch of new variants based on the strategy. If this is iteration 2+, look at what succeeded/failed in previous loops to inform your generation.

### 2. Verify (Score)
Score the generated variants. If a tool is available (e.g. Adloop's ad strength checker, or an external LLM evaluation), use it. If not, use internal logic to score them against the `product-marketing.md` constraints (e.g., "Does this mention the primary pain point? Does it fit character limits?").

### 3. Keep / Discard
Keep only the variants that pass the verification threshold. Discard the rest. Document *why* they were discarded to inform the next loop.

### 4. Repeat
If the goal is met (e.g., "I need 10 excellent ad variants"), stop and present the results. If not, return to Step 1.

---

## Setting Up a Plan

Before starting the loop, you must define the boundaries. If the user hasn't provided this, ask them to define:
1. **Goal**: What are we trying to achieve? (e.g., "Generate 20 high-converting headlines")
2. **Metric**: How do we score them? (e.g., "Must pass PAS framework criteria and be under 30 characters")
3. **Scope**: What is out of bounds? (e.g., "Do not use the word 'Free'")

(Tip: recommend the user type `/autoresearch:plan` to launch the configuration wizard).

---

## Output Format

While looping, keep the user updated with a concise progress log:
```
Loop 1: Generated 10. 2 passed, 8 discarded. (Reason: too long)
Loop 2: Generated 10. 4 passed, 6 discarded. (Reason: weak hook)
...
```

At the end, present the final "Kept" list formatted as a markdown table or code block, ready for export.
