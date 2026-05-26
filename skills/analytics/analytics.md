---
name: analytics
description: Set up tracking, analyze traffic, interpret GA4 data, and fix attribution gaps.
---
# Analytics Skill

## When to Use This Skill

Activate when the user is:
- Setting up or auditing GA4 or Google Analytics tracking
- Diagnosing traffic drops, conversion rate changes, or attribution issues
- Analyzing funnel performance, event data, or audience behavior
- Building dashboards or interpreting key marketing metrics

Read `product-marketing.md` first to understand which metrics matter most for this business.

---

## GA4 Audit Checklist

Before drawing conclusions, verify these foundational items:

| Check | How to Verify |
|-------|---------------|
| GA4 tag firing | Check Realtime > Events — do page_view events appear? |
| Conversion events | Confirm key_events are marked in Admin > Events |
| Cross-domain tracking | Use DebugView to verify cookies persist across domains |
| Bot traffic exclusion | Admin > Data Filters — is "Internal traffic" excluded? |
| Sampling thresholds | Use smaller date ranges or BigQuery for sampled reports |

---

## Core Metrics to Always Report

When summarizing analytics, structure findings around these:

```
Sessions       | The entry point — is traffic growing or shrinking?
Engaged rate   | >50% is healthy. <30% is a red flag.
Avg. engagement| Low time on page = message mismatch or poor UX
Key events     | Purchases, signups, demo requests — the real measure
Conversion rate| Key events / Sessions. Benchmark vs. industry.
Bounce rate    | (GA4 definition differs from UA — clarify which)
Source/Medium  | Which channels drive quality vs. volume?
```

---

## Attribution Models

Explain these to the user when comparing channel performance:

- **Last Click** (default): Credits the last touchpoint before conversion. Biased toward bottom-of-funnel channels (search, retargeting).
- **First Click**: Credits the first touchpoint. Biased toward top-of-funnel (social, display).
- **Data-Driven** (GA4 default): ML-based, distributes credit across touchpoints. Best for accounts with >1K conversions/month.
- **Linear**: Equal credit to all touchpoints. Simple but rarely accurate.

> Always ask: "Are you comparing channels using the same attribution model?" Mixing models is a common mistake.

---

## Diagnosing Traffic Drops

If the user reports a traffic or conversion drop:

1. **Isolate the time range**: Compare week-over-week and year-over-year to rule out seasonality.
2. **Segment by channel**: Did organic, paid, or direct drop? Or all of them?
3. **Check for tracking breaks**: Did the drop coincide with a code deploy or tag manager update?
4. **Look at landing pages**: Which pages lost traffic? Is it a crawling/indexing issue?
5. **Compare device segments**: Did mobile drop while desktop held? Could be a UX or load speed issue.
6. **Check Search Console**: Organic impressions vs. clicks — ranking drop or CTR drop?

---

## Output Format

When reporting analytics findings, use this structure:

```markdown
## Analytics Summary — [Date Range]

### 📊 Traffic Overview
| Metric | This Period | Prior Period | Change |
|--------|-------------|--------------|--------|
| Sessions | | | |
| Engaged Rate | | | |
| Key Events | | | |
| CVR | | | |

### 🔴 Critical Issues
- [Issue]: [Impact] → [Recommended Action]

### 🟡 Warnings
- [Issue]: [Impact] → [Recommended Action]

### 🟢 Opportunities
- [Opportunity]: [Potential Impact] → [Next Step]

### 📋 Recommended Actions (Priority Order)
1. [Action] — [Expected Impact]
2. [Action] — [Expected Impact]
```
