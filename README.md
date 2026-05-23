# OpenAds 🎯

> **The open-source AI agent for digital marketers.** Bring your own LLM, connect your ad accounts, and talk to your campaigns in plain English.

<p align="center">
  <img src="https://img.shields.io/badge/Google%20Ads-MCP-4285F4?style=flat-square&logo=google-ads" />
  <img src="https://img.shields.io/badge/Meta%20Ads-MCP-1877F2?style=flat-square&logo=meta" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

OpenAds is an autonomous AI co-pilot designed specifically for performance marketers, media buyers, and growth leads. It combines the power of modern LLMs with deep marketing context (Skills) and direct platform access (MCPs).

## Features
- **No-code Setup**: A guided terminal wizard connects your API keys and OAuth accounts in 60 seconds.
- **Marketing Skills**: Comes pre-loaded with playbooks for Google Ads, Meta, SEO, CRO, and Copywriting. The AI thinks like a senior marketer.
- **Platform Access**: Connects to Google Ads and Meta Ads securely. **Write operations are always previewed first — nothing goes live without your explicit `Y`.**
- **Autoresearch**: Run autonomous improvement loops to test ad variants, generate hypotheses, and score them against your strategy overnight.

---

## ⚡ Quick Start

**1. Install**
```bash
npm install -g openads-ai
```

**2. Setup (Run once)**
```bash
openads setup
```
*The setup wizard will ask you to choose your LLM (Claude, GPT, etc.), connect your Google/Meta accounts via your browser, and set your product context.*

**3. Run**
```bash
openads
```

### Try these commands:
- `> Audit my Google Ads account and flag budget waste`
- `> Write 3 Meta ad headlines for my product`
- `> /autoresearch:plan` (Run an autonomous iteration loop)
- `> /write-ad-copy`

---

## How It Works Under the Hood

OpenAds is a seamless experience built on top of incredible open-source projects:

1. **The Engine**: OpenAds runs on the [Pi](https://pi.dev) agent framework.
2. **The Skills**: The marketing knowledge injected into the context is inspired by [marketingskills](https://github.com/coreyhaines31/marketingskills).
3. **The Tools**: Google Ads integration is powered by a built-in fork of [adloop](https://github.com/kLOsk/adloop). Meta Ads integration connects directly to Meta's official hosted MCP.

---

## Contributing

We want OpenAds to be the standard tool for AI-assisted marketing. The best way to contribute is to add or improve a **Skill**.

Read [CONTRIBUTING.md](CONTRIBUTING.md) to see how you can add a new skill markdown file in minutes.

---

## License

MIT. 

*Credits: Built on [Pi](https://github.com/earendil-works/pi) (MIT). Includes tools derived from [adloop](https://github.com/kLOsk/adloop) (MIT) by kLOsk. Marketing skills inspired by [marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT) by Corey Haines.*
