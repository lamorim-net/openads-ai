---
name: autoresearch-evals
description: Analyze past experiment and campaign results to extract patterns and recommend the next test.
---
# Autoresearch: Analyze Past Results (`/autoresearch:evals`)

## When to Use This Skill

Activate this skill when the user triggers `/autoresearch:evals` or selects "Analyze past results" from the submenu. Use this to audit and evaluate past campaign data, CSV experiment logs, or prior loop results to see what worked, what failed, and what to do next.

---

## Analysis Methodology

Analyze the user's prior data looking for five critical structural indicators:

1. **Winning Patterns**: What commonalities exist in top performers? (e.g. "Action-oriented CTAs drove 40% higher click rates", "Testimonial copy outperformed benefit claims").
2. **Losing Patterns**: What should we stop doing? (e.g. "Discount offers attracted low-LTV customers", "Passive hooks underperformed across all demographics").
3. **Trends**: How is performance moving over time? Are click costs increasing while conversions decrease?
4. **Plateaus**: Identify where optimization gains have stalled (e.g. "CTR has remained flat at 1.2% for 4 weeks despite creative testing").
5. **Channel Gaps**: Where are we missing attribution or volume?

---

## Output Deliverables

Provide a comprehensive **Experiment Evals Report**:

1. **Performance Trend Summary**:
   - A concise paragraph outlining the direction of performance, summarizing details from the ingested data.
2. **Winners & Losers Table**:
   - A table contrasting winning elements (e.g., specific angles, offers, hooks) with losing elements, showing concrete data patterns.
3. **The Next Move Recommendation**:
   - The exact next experiment to run based on these findings. This should define: the new hypothesis to test, the target metric, and how to set it up in the core loop.
