# OpenAds 🎯

```
   ####  #####  ###### #    #    ##   #####   ####
  #    # #    # #      ##   #   #  #  #    # #
  #    # #####  #####  # #  #  #    # #    #  ####
  #    # #      #      #  # #  ###### #    #      #
  #    # #      #      #   ##  #    # #    # #    #
   ####  #      ###### #    #  #    # #####   ####

  AI Command Center for Marketers
```

> **Talk to your ad campaigns in plain English.** Connect your Google Ads and Meta accounts, pick your favorite AI model, and let OpenAds handle the analysis while you focus on strategy.

<p align="center">
  <img src="https://img.shields.io/badge/Google%20Ads-MCP-4285F4?style=flat-square&logo=google-ads" />
  <img src="https://img.shields.io/badge/Meta%20Ads-MCP-1877F2?style=flat-square&logo=meta" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## What is OpenAds?

OpenAds is an **open-source CLI tool** that turns any AI model into a marketing assistant. It's built for performance marketers, media buyers, and growth leads who want to audit campaigns, write ad copy, and build strategies — all from one place.

**No code. No prompt engineering. No spreadsheet exports.**

### Why use it?

| Feature | What it means for you |
|---|---|
| 🧠 **Pre-built marketing skills** | The AI already knows Google Ads best practices, Meta creative formats, CRO frameworks, and copywriting rules. You just ask. |
| 🔌 **Direct platform access** | Connect your Google Ads and Meta accounts. The AI reads your live data — no more copy-pasting reports. |
| 🤖 **Bring your own model** | Use Google Gemini, OpenAI, Claude, or a local model running on your machine. Your choice. |
| 🛡️ **Nothing goes live without you** | The AI can read freely, but every write operation (campaign change, budget edit) requires your explicit approval. |
| ⚡ **Autonomous loops** | Let the AI research competitors, test ad variants, and generate hypotheses overnight. Review in the morning. |

---

## ⚡ Quick Start

### 1. Install

```bash
npm install -g openads-ai
```

> **Tip:** If you see a permissions error, prefix with `sudo` or [configure npm for global installs](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally).

### 2. Set up (one time)

```bash
openads setup
```

The setup wizard walks you through three things:
- **Pick your AI model** — choose from Google Gemini, OpenAI, Claude, a local model, or any OpenAI-compatible provider
- **Connect your ad accounts** — Google Ads and/or Meta Ads (both optional)
- **Describe your business** — so the AI can tailor copy and strategy to your product

### 3. Launch

```bash
openads
```

That's it. You'll see a menu with quick actions. Pick one, or just type your question in plain English.

---

## 💡 What can I do with it?

Here are some real examples:

| You type | What happens |
|---|---|
| `Audit my Google Ads account and flag budget waste` | The AI reads your live campaign data, identifies underperforming keywords, and tells you exactly where you're losing money. |
| `Write 3 Meta ad headlines for my product` | The AI uses your product context to generate targeted, conversion-focused headlines within platform character limits. |
| `/autoresearch-plan` | The AI works autonomously — analyzing competitors, generating hypotheses, and reporting back with a full strategy. |
| `Build a go-to-market plan for my Q3 launch` | The AI produces a structured GTM playbook covering positioning, channels, budget, and timelines. |

---

## 🔒 Security & Privacy

- **Runs 100% locally.** OpenAds is not a cloud service. Nothing leaves your machine except the API calls you authorize.
- **No telemetry.** We don't track usage, store data, or phone home.
- **Your keys stay on disk.** API keys and tokens are saved to `~/.openads/` on your hard drive. They never touch our servers.
- **Explicit approval for all writes.** The AI previews every campaign change before execution. Nothing goes live without your `Y`.

---

## 🩺 Troubleshooting

Run the built-in diagnostics to check your setup:

```bash
openads doctor
```

This verifies your config file, API keys, platform connections (live token checks), and required tools like `uvx`.

---

## 🗺️ Roadmap

- [x] Google Ads integration via MCP
- [x] Meta Ads integration via MCP
- [x] Interactive setup wizard with live token verification
- [x] Pre-built skills: Google Ads, Meta, SEO, CRO, Copywriting, Analytics
- [x] Autonomous research loops
- [ ] LinkedIn Ads integration
- [ ] Pinterest Ads integration
- [ ] Publish to npm registry
- [ ] Web dashboard (long-term)

---

## 🤝 Contributing

We want OpenAds to be the standard open-source tool for AI-assisted marketing. You don't need to be a developer to contribute — marketing playbooks and strategy templates are just as valuable as code.

Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## Our Principles

1. **Radical Simplicity** — Non-technical marketers must feel at home. No forcing users to learn code, prompt engineering, or API error messages.
2. **Marketers First** — We design around marketing workflows (audits, copy, analysis), not software concepts.
3. **Safety by Default** — AI should never spend money or publish campaigns without human approval.

---

## License

MIT.

*Built on [Pi](https://github.com/earendil-works/pi) (MIT). Includes tools derived from [adloop](https://github.com/kLOsk/adloop) (MIT) by kLOsk. Marketing skills inspired by [marketingskills](https://github.com/coreyhaines31/marketingskills) (MIT) by Corey Haines.*
