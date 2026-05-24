---
name: customer-research
description: Understand your audience before writing a single ad.
---
# Customer Research

## When to Use This Skill

Activate when the user needs to:
- Define or refine their Ideal Customer Profile (ICP)
- Understand what language their customers use (voice-of-customer)
- Identify pain points, objections, and buying triggers
- Research a new market or audience segment before launching ads

Read `product-marketing.md` first to check if context already exists.

---

## Research Frameworks

### 1. Jobs To Be Done (JTBD)
Ask: "When [situation], I want to [motivation], so I can [outcome]."
This reveals the real reason people buy — not the feature, but the progress they're trying to make.

### 2. Voice-of-Customer Mining
Pull real language from:
- G2/Capterra reviews (yours and competitors)
- Reddit threads in your niche
- Support tickets and chat logs
- Sales call transcripts
- Amazon reviews for adjacent products

Use their exact words in ad copy. Customers describe problems better than marketers do.

### 3. The "Five Whys" for Pain Points
Start with the surface problem and ask "why?" five times to get to the emotional root:
1. "Our sales are down" → Why?
2. "We're not getting enough leads" → Why?
3. "Our ads aren't converting" → Why?
4. "We're targeting the wrong people" → Why?
5. "We don't actually know who our best customer is" ← This is the real problem.

---

## Output Format

When completing customer research, produce a structured brief:

```yaml
audience:
  who: ""           # Job title, demographics, or persona
  situation: ""     # What's happening in their life/business right now
  pain_points:
    - ""            # Top 3 pains in their own words
  objections:
    - ""            # Top 3 reasons they wouldn't buy
  buying_triggers:
    - ""            # What makes them start looking for a solution
  success_metric: "" # How they measure if it worked
  language:
    words_they_use: []   # Exact phrases from reviews/forums
    words_to_avoid: []   # Jargon or terms that don't resonate
```
