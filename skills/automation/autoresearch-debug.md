---
name: autoresearch-debug
description: Hypothesis-driven root cause analysis to diagnose underperforming marketing campaigns or landing pages.
---
# Autoresearch: Debug Underperformance (`/autoresearch:debug`)

## When to Use This Skill

Activate this skill when the user triggers `/autoresearch:debug` or selects "Debug underperformance" from the submenu. Use this when a campaign, landing page, or funnel experiences a sudden drop or prolonged stagnation in performance and the user wants to identify the root cause.

---

## 8 Diagnostics Hypotheses

The debugging engine tests the problem against 8 potential root causes:

1. **Creative Fatigue**: High frequency has exhausted creative interest, leading to lower CTR.
2. **Audience Saturation**: The targeted audience pool is depleted; conversion costs are climbing.
3. **Competitor Entry**: A new competitor has launched a aggressive offer or outbid your key terms.
4. **Seasonality / Macro**: Holiday shifts, weekend drops, or economic news are depressing demand.
5. **Platform Algorithm**: Ad delivery optimization has shifted or a bidding policy change has occurred.
6. **Landing Page Regression**: Recent code/content updates have broken checkout or slowed down page load.
7. **Tracking Break**: Pixels are not firing; conversion events are missing or duplicated in reporting.
8. **Message-Market Misfit**: The ad message does not align with landing page expectations, causing high bounce rates.

---

## The 15-Iteration Diagnostic Loop

- **Iterations 1-8**: Systematically test each of the 8 hypotheses against the campaign's symptoms and metrics.
- **Iterations 9-12**: Gather additional evidence, narrowing the suspects down to the primary root cause.
- **Iterations 13-15**: Generate a targeted recovery roadmap to fix the issue and restore performance.

---

## Output Deliverables

1. **Root Cause Diagnostic Table**:
   - A list of the tested hypotheses, matched with the observed evidence and rated by likelihood (Primary Cause / Contributing / Ruled Out).
2. **Campaign Recovery Plan**:
   - Immediate actions to take (e.g. refresh creative, fix pixel, adjust target bid) to get the campaign back on track.
