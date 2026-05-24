# Contributing to OpenAds

Thank you for helping build the open-source AI Command Center for digital marketers!

Our vision is to democratize advanced AI capabilities for marketing professionals. **You do not need to be a software engineer to contribute to this project.** We need marketing experts, copywriters, and media buyers just as much as we need developers.

---

## 🧠 For Marketers: Teach the AI (No-Code)

The core intelligence of OpenAds comes from **Skills**. Skills are simply plain text files that live in the `/skills` directory. They teach the AI how to think about specific marketing disciplines.

If you have expertise in a marketing channel (e.g., LinkedIn Ads, SEO, Programmatic, TikTok), you can contribute by writing a playbook for the AI to follow.

### How to Add a Skill
1. Create a new text file in the `/skills` folder (e.g., `tiktok-ads.md`).
2. Follow this structure:

```markdown
---
name: [skill-name]
description: [Short description of what the skill does]
---

# [Name of Skill]

## When to Use This Skill
Activate this skill when the user is doing [X, Y, or Z].

## Core Concepts & Frameworks
[Explain the best practices the AI should follow. E.g., character limits, bidding strategies, psychological hooks].

## Tools to Use
[If a platform integration is connected, list the tools the AI should call].
```
3. Submit a Pull Request. That's it! You've just upgraded the brain of OpenAds for everyone.

---

## 💻 For Developers: Build Pre-built Integrations

OpenAds relies on direct integrations to interact with external platforms. Instead of forcing marketers to write Python scripts to connect to APIs, we want to provide pre-built integrations that plug directly into their command center.

If you want to build an integration for a new platform (e.g., TikTok Ads, LinkedIn Campaign Manager, HubSpot, Salesforce):

1. **Open an Issue**: Please open a discussion first to talk about the architecture and login flow.
2. **Prioritize Simplicity**: The end-user should only have to click a login link or paste a password token. Hide all API complexity.
3. **Safety First**: All write operations (creating campaigns, changing budgets) MUST follow the `draft -> preview -> confirm` pattern. We never want OpenAds to spend money without explicit user approval.

### Testing Locally
1. Clone the repository.
2. Run `npm install` and `npm run build`.
3. Use `npm install -g .` to test the CLI globally on your machine.

We look forward to reviewing your contributions!
