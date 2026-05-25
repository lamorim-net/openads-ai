---
name: autoresearch-plan
description: Interactive planner to convert a marketing goal into a validated experiment configuration.
---
# Autoresearch: Plan My Experiment (`/autoresearch:plan`)

## When to Use This Skill

Activate this skill when the user triggers the `/autoresearch:plan` command or selects "Plan my experiment" from the Autoresearch submenu. This acts as the interactive on-ramp for marketers who want to set up a structured experiment but need help defining their variables.

---

## Interactive Planning Sequence

Walk the user through the 4 core pillars of a structured marketing experiment. If the user provides a CSV or performance logs upfront, ingest it immediately to pre-fill or suggest the options!

### 1. Goal Formulation
Help the user specify a concrete, focused growth goal.
- *Examples*: "Increase Google Ads headline CTR by 25%", "Optimize Shopify landing page conversion rate", "Improve onboarding email open rate".

### 2. Metric Definition
Define a clear, objective scoring metric.
- *Examples*: "Must address the target pain point (5/5 PAS score) and fit within 30 characters", "Must highlight the value proposition and align with brand voice rules".

### 3. Scope & Constraints
Establish bounds to prevent off-brand or illegal ideas.
- *Examples*: "No discounts or promo codes", "Must sound premium/professional", "Avoid mentioning competitor names".

### 4. Prior Data Ingestion (Fuel)
Ask if they have past campaign performance data, A/B test results, or a CSV file of previous creative copy.
- If provided, parse it immediately! Extract winning trends and losing patterns as fuel to pre-populate the strategy.

---

## Output & Action Call

At the end of the interactive planning sequence, output a beautiful **Experiment Config Card**:

```markdown
### 📋 Validated Experiment Configuration

- **Goal**: [Concrete Goal]
- **Metric**: [Objective Scoring Metric]
- **Scope & Constraints**: [List of rules/limitations]
- **Prior Data Insights**: [Top 3 patterns extracted from prior data]
```

### Next Action Trigger
Conclude by asking the user directly:
**"Would you like me to start the autonomous loop now? (Y/N)"**
- If they say **Yes**, transition directly into executing the core `/autoresearch` loop using this configuration.
