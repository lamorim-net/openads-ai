# OpenAds 🎯

> **The AI Command Center for Digital Marketers.** Bring your own LLM, connect your ad accounts, and talk to your campaigns in plain English.

<p align="center">
  <img src="https://img.shields.io/badge/Google%20Ads-MCP-4285F4?style=flat-square&logo=google-ads" />
  <img src="https://img.shields.io/badge/Meta%20Ads-MCP-1877F2?style=flat-square&logo=meta" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

## The Vision

Marketers shouldn't need to understand code, complex prompt engineering, or API rate limits to leverage the world's most powerful AI models. 

**OpenAds is built on a single premise: Radical Simplicity.**

We provide a seamless, terminal-based command center where you can connect your data sources, load pre-built marketing intelligence, and command your advertising infrastructure autonomously. It bridges the gap between state-of-the-art AI agents and the everyday workflows of performance marketers, media buyers, and growth leads.

## Why OpenAds?

- 🧠 **Pre-trained Marketing Brain (Skills)**: OpenAds comes pre-loaded with playbooks for Google Ads, Meta, SEO, CRO, and Copywriting. The AI doesn't just write text; it thinks like a senior marketer, analyzing your Ideal Customer Profile before generating a single word.
- 🔌 **Plug-and-Play Integrations (MCPs)**: Through the Model Context Protocol (MCP), OpenAds connects directly to your platforms. No more downloading CSVs to paste into ChatGPT. 
- 🛡️ **Bulletproof Security**: Read what you want, but write operations are always previewed first. **Nothing goes live without your explicit `Y`.**
- ⚡ **Autonomous Execution**: Run autonomous improvement loops to test ad variants, generate hypotheses, and score them against your strategy overnight.

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
*The no-code setup wizard will ask you to choose your preferred AI model (Google Gemini, OpenAI, Claude, or Local AI), connect your Google/Meta accounts, and define your core product context.*

**3. Run the Command Center**
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

OpenAds is a frictionless wrapper built on top of incredible open-source projects:

1. **The Engine**: OpenAds runs on the highly capable [Pi](https://pi.dev) autonomous coding agent framework.
2. **The Skills**: The marketing knowledge injected into the context is inspired by [marketingskills](https://github.com/coreyhaines31/marketingskills).
3. **The Tools**: Google Ads integration is powered by a built-in fork of [adloop](https://github.com/kLOsk/adloop). Meta Ads integration connects directly to Meta's official hosted MCP.

---

## Contributing

We want OpenAds to be the standard open-source tool for AI-assisted marketing. Whether you are a senior media buyer or a Typescript developer, you can help build the future of this project.

Read [CONTRIBUTING.md](CONTRIBUTING.md) to see how you can contribute to the marketing brain or build new MCP integrations.

---

## License

MIT. 

*Credits: Built on [Pi](https://github.com/earendil-works/pi) (MIT). Includes tools derived from [adloop](https://github.com/kLOsk/adloop) (MIT) by kLOsk. Marketing skills inspired by [marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT) by Corey Haines.*
