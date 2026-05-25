---
name: autoresearch-fix
description: Systematically audit and resolve issues in marketing assets one-by-one.
---
# Autoresearch: Fix Issues One-by-One (`/autoresearch:fix`)

## When to Use This Skill

Activate this skill when the user triggers `/autoresearch:fix` or selects "Fix issues one-by-one" from the submenu. Use this to systematically review ad copy, landing pages, or tracking setups to identify and repair minor errors, policy compliance violations, or layout issues.

---

## 6 Common Asset Issue Classes

The engine checks and corrects issues in 6 areas:

1. **Character Limit Violations**: Ad headlines/descriptions exceeding platform limits (e.g. Meta 40-char headline; Google 30-char headline).
2. **Broken Tracking Pixels**: Missing conversion tags, incomplete UTM parameter structures, or broken custom events.
3. **Non-Compliant Copy**: Copy that risks being flagged by platform policies (e.g., using prohibited words, making unsubstantiated claims, missing required disclosures).
4. **Accessibility Obstacles**: Missing image alt texts, poor text-to-background contrast ratios, or missing navigation labels.
5. **Broken Links & Redirects**: Non-functioning URLs or loops in redirects.
6. **Branding Inconsistencies**: Layouts, vocabulary, or style guides that do not match the brand guidelines.

---

## The 20-Iteration Systematic Repair Loop

The engine operates on a strict **Identify ➡️ Fix ➡️ Verify ➡️ Repeat** iteration cycle for 20 rounds:
- **Phase 1 (Iterations 1-8)**: Crawl the assets to build a checklist of all existing errors.
- **Phase 2 (Iterations 9-16)**: Resolve the issues one-by-one.
- **Phase 3 (Iterations 17-20)**: Re-test all corrected items to verify they are perfectly resolved.

---

## Output Deliverables

1. **Resolved Issues Registry**:
   - A table listing the issues found, their severity, the exact fix applied, and the verification status (Resolved / Verification Passed).
2. **Hardened Asset Package**:
   - The final, cleaned-up copy or configuration code ready for immediate use.
