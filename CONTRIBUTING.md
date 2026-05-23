# Contributing to OpenAds

Thank you for helping build the open-source AI agent for marketers!

## The Best Way to Contribute: Add a Skill

Skills are just Markdown files that live in the `/skills` directory. You don't need to write code to make OpenAds smarter.

If you have expertise in a marketing channel (e.g., LinkedIn Ads, SEO, Programmatic), you can add a skill by following this structure:

### Skill Template
```markdown
# [Name of Skill]

## When to Use This Skill
Activate this skill when the user is doing [X, Y, or Z].

## Core Concepts & Frameworks
[Explain the best practices the AI should follow. E.g., character limits, bidding strategies, psychological hooks].

## Tools to Use
[If an MCP is connected, list the tools the AI should call].
```

1. Create your `.md` file in the appropriate `/skills` subfolder.
2. Submit a Pull Request.

## Adding MCP Integrations

If you want to build an MCP server for a new platform (e.g., TikTok, LinkedIn, HubSpot), please open an issue first to discuss the architecture. 

All write tools MUST follow the `draft -> preview -> confirm` pattern. We never want OpenAds to spend money without explicit user approval.
