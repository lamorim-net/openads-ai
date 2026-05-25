---
name: autoresearch-ship
description: Prepare winning assets for direct deployment with formatting, QA, and tracking specs.
---
# Autoresearch: Prepare Assets to Ship (`/autoresearch:ship`)

## When to Use This Skill

Activate this skill when the user triggers `/autoresearch:ship` or selects "Prepare assets to ship" from the submenu. Use this to take winning hypotheses from previous experiments and prepare them into a deployment-ready launch package.

---

## 6 Linear Shipping Phases

The ship command moves sequentially through 6 linear preparation phases:

1. **Format (Platform Adaptation)**: Format the winning copy/creative to fit target platform specifications exactly:
   - *Meta Ads*: 125 char Primary Text, 40 char Headline, 30 char Description.
   - *Google Ads*: 30 char Headline, 90 char Description.
   - *Email*: 50 char Subject Line, 150 char Preview Text.
2. **QA Check**: Verify character counts, screen for prohibited platform words, and test links.
3. **Generate Variants**: Produce 3 platform-specific creative variations of the main hook to prevent creative fatigue.
4. **Tracking Specifications**: Recommend precise UTM parameters, tracking pixels, and conversion event triggers to monitor.
5. **Timeline & Sample Size**: Suggest the optimal test duration, starting budget, and required sample size for statistical validity.
6. **Deployment Brief**: Construct a clean brief that can be handed to a media buyer or agency team.

---

## Output Deliverables

Output a professional **Deployment-Ready Assets Package**:

1. **Launch Specs Table**:
   - A table listing the formatted creative copy, target channels, character counts, and UTM URLs.
2. **QA & Tracking Brief**:
   - Clear QA confirmation, conversion events to track, and recommended launch test settings (e.g., "Run for 14 days, target budget $50/day, monitor Purchase events").
3. **AUTOMATIC REPORT EXPORT**:
   - The entire package must be automatically saved to `~/.openads/reports/deployment-brief-[timestamp].md`.
