---
name: product-marketing
description: Core context about the business, ICP, and value proposition.
---
# Product Marketing Foundation

## When to Use This Skill

Read this skill **first** before applying any other marketing skill. It defines your product context, ICP, positioning, and messaging — every other skill uses this as its foundation.

This skill activates when the user is:
- Setting up their marketing context for the first time
- Working on any marketing task and no product context has been established
- Explicitly asking you to understand their product

---

## Instructions

If a `PRODUCT_CONTEXT.md` file exists in the project root or the context was loaded from the OpenAds setup config, read it first and use it.

If no context exists:
Ask the user to fill out this context. Once established, reference it in every subsequent task.

### Required Context to Establish

```yaml
# Product Marketing Context
product:
  name: ""
  tagline: ""
  category: ""          # e.g. "SaaS", "ecommerce", "mobile app", "marketplace"

icp:                    # Ideal Customer Profile
  who: ""               # Job title or persona description
  key_pain: ""          # The #1 problem they have that you solve

positioning:
  differentiator: ""    # Your defensible advantage
  value_metric: ""      # How they measure success

messaging:
  primary_message: ""   # One sentence: what you do and for whom
  tone: ""              # e.g. "authoritative but approachable", "playful"
```

## Using This Context in Other Skills

When applying any other marketing skill, always:
1. Reference `product.name` and `icp.who` in every output
2. Align copy and recommendations to `positioning.differentiator`
3. Use `messaging.tone` for all written content
4. Frame results in terms of `icp.key_pain`
