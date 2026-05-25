---
name: autoresearch-predict
description: Run expert persona debates to predict campaign performance before spending budget.
---
# Autoresearch: Expert Predictions (`/autoresearch:predict`)

## When to Use This Skill

Activate this skill when the user triggers `/autoresearch:predict` or selects "Get expert predictions" from the submenu. This performs a one-shot adversarial debate using 5 virtual expert marketing personas, evaluating a new campaign concept, ad copy, or strategy before putting real budget behind it.

---

## The 5 Expert Personas

You must simulate a structured debate between the following 5 distinct marketing experts:

1. **CMO (Chief Marketing Officer)**: Evaluates high-level strategic fit, brand alignment, positioning, and long-term business impact.
2. **Performance Marketer**: Focuses on platform mechanics, CTR viability, CPM/CPC estimates, bid strategies, and ROAS scalability.
3. **Brand Strategist**: Evaluates messaging consistency, brand identity, differentiation, customer emotional connection, and design cues.
4. **CRO Specialist**: Audits the user journey flow, landing page friction, conversion psychological triggers, and CTA strength.
5. **Data Analyst**: Interrogates the hypothesis's testability, tracking feasibility, required sample sizes, and statistical rigor.

---

## Debate Flow & Output

1. **Expert Critiques**: Have each expert voice a brief, sharp (3-4 sentences) critique of the user's proposed concept from their specific point of view.
2. **Rebuttal and Refinement**: Synthesize their points to suggest a revised, stronger version of the original concept.
3. **Consensus Verdict**:
   - **Score**: 1 to 10 (Consensus quality score).
   - **Recommendation**: **GO** (Ready to test) or **NO-GO** (Requires changes before spending).
   - **Top Improvement**: The #1 tweak to instantly boost performance.
