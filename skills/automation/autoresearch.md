---
name: autoresearch
description: Core autonomous loop to generate, score, and iterate on new marketing hypotheses.
---
# Autoresearch (Autonomous marketing loop)

## When to Use This Skill

Activate this skill when the user triggers the core autonomous marketing loop (`/autoresearch` or selecting "Generate new hypotheses" in the CLI). This is the autonomous **Modify (Generate) ➡️ Verify (Score) ➡️ Keep/Discard ➡️ Repeat** engine.

The core philosophy of Autoresearch is:
1. **Goal + Metric + Loop** — Define a clear goal, a rigorous metric, and loop autonomously.
2. **Prior data is fuel, not the deliverable** — Do not spend the conversation summarizing prior results. Quickly extract winning and losing patterns behind the scenes, and immediately use them to generate smarter, NEW hypotheses.
3. **The output is NEW, testable assets** — The final deliverable is always a prioritized table of concrete assets (headlines, ad copy variants, landing page layouts, creative hooks) ready to be tested.

---

## The Autoresearch Loop Execution

When running the loop, execute at least **3 full cycles** autonomously before presenting the final results. Do not stop to prompt the user between cycles.

### Phase 0: Validate Goal & Metric (MUST NOT GUESS)
- Before you begin any loop cycles, you MUST verify that the user's specific **Goal** (what assets to test, e.g. headlines, landing page copy, ad hook variants) and **Metric** (how to score them) have been explicitly defined in this conversation.
- If they are not yet explicitly provided or confirmed by the user in this session, you MUST halt immediately, present 3 concrete, inspiring examples of goals and metrics, and ask the user to input their custom Goal and Metric before launching the loop.
- **NEVER** guess a goal/metric or automatically proceed with loop cycles on a generic assumption!

### Phase 1: Ingest Fuel & Initialize
- Quickly review `product-marketing.md` and any provided prior experiment data (like a CSV or campaign performance logs).
- **CONCISE INGESTION RULE**: Extract 3-5 high-level patterns of what worked and what failed. Do not list individual rows or campaigns one-by-one.
- Initialize the iteration counter.

### Phase 2: Autonomous Iteration Loop
For each loop (run at least 3):
1. **Modify (Generate)**: Generate a batch of NEW testable hypotheses (e.g. headlines, hooks, page variants). If iteration 2+, adapt based on the reasons why previous variants failed or succeeded.
2. **Verify (Score)**: Evaluate each hypothesis against the defined metric (e.g., PAS framework, character limits, compliance, brand alignment) and product context. Assign a numeric score.
3. **Keep / Discard**: Keep only variants scoring above your quality threshold. Discard the rest, noting the specific reason for failure (e.g. "too generic", "no clear pain point", "exceeded 30-char limit").

### Phase 3: Reporting & Automatic Export
- Log the progress of each cycle to the user:
  ```
  Loop 1: Generated 10 hypotheses. 3 passed, 7 discarded. (Reasons: too long, weak hook)
  Loop 2: Generated 8 hypotheses. 5 passed, 3 discarded. (Reasons: too generic)
  Loop 3: Generated 8 hypotheses. 6 passed, 2 discarded. (Reasons: off-brand)
  ```
- Present a final prioritized table of the **NEW** testable assets, containing:
  - **Asset/Copy**: The literal text/layout to test.
  - **Rationale**: Why this is expected to win based on prior patterns or marketing frameworks.
  - **Priority Score**: High / Medium / Low.
- **AUTOMATIC FILE EXPORT**: You MUST automatically save the final prioritized list of hypotheses to a markdown report on disk: `~/.openads/reports/autoresearch-[timestamp].md`.
