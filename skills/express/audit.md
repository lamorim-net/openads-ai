---
name: audit-express
description: Quick campaign performance audit.
---
# Campaign Audit

Check the user's ad campaigns and flag issues clearly.

If the user pasted campaign data, analyze it directly. If no data is provided, ask them to paste their campaign metrics or describe their campaigns.

## Output Format

Use this exact structure:

### 📊 Campaign Overview
| Campaign | Status | Spend | CTR | ROAS | Conversions |
|----------|--------|-------|-----|------|-------------|
| [name] | [active/paused] | [$X] | [X%] | [Xx] | [X] |

### Issues Found
- 🔴 **[Critical]**: [Issue] → [Fix in 1 sentence]
- 🟡 **[Warning]**: [Issue] → [Fix in 1 sentence]
- 🟢 **[Opportunity]**: [Untapped potential] → [Action in 1 sentence]

### Top 3 Actions
1. **[Action]** — [Expected impact]
2. **[Action]** — [Expected impact]
3. **[Action]** — [Expected impact]
