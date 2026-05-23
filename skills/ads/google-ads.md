# Google Ads Skill

## When to Use This Skill

Activate when the user is:
- Auditing or analyzing Google Ads campaigns, ad groups, or keywords
- Writing responsive search ads (RSAs)
- Planning keyword strategy or negative keywords
- Troubleshooting conversion tracking or ROAS issues
- Using the `/audit-google-ads` or `/write-ad-copy` templates

Read `product-marketing.md` first to understand the product context.

---

## Core Concepts to Apply

### Campaign Structure Best Practices
- **Single Theme Ad Groups (STAGs)**: One tight keyword theme per ad group
- **Exact and Phrase match first**, add Broad only after proving performance
- **Negative keywords** are as important as positive keywords

### Bidding Strategy Decision Tree
```
Do you have ≥30 conversions/month?
  Yes → Smart Bidding (Target CPA or Target ROAS)
  No  → Manual CPC or Maximize Clicks with a max CPC cap
          ↳ Never use Broad match on Manual CPC (budget bleed risk)
```

### Quality Score Levers
1. **Expected CTR** — headline relevance to keyword
2. **Ad Relevance** — keyword in headlines/description
3. **Landing Page Experience** — load speed, relevance
- QS 7+ is good; 9–10 is excellent; below 5 needs attention

### Responsive Search Ads (RSA) Writing Rules
- **15 headlines**, max 30 characters each (spaces count)
- **4 descriptions**, max 90 characters each
- Pin headline 1 = brand or primary value prop
- Include at least one headline with the exact keyword
- At least one urgency or CTA in descriptions

---

## MCP Tools to Use

If Google Ads MCP is connected, you have access to tools for retrieving campaign performance, keyword metrics, search terms, and generating drafts.
**Always use draft → preview → confirm for any write operation. Never execute without user confirmation.**
