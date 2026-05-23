# Connecting Google Ads

OpenAds connects to Google Ads and GA4 via **AdLoop**.

## 1. Install `uv`
We use `uv` (a blazing fast Python package runner) to run the tools without messing up your computer's environment.
- On Mac/Linux: `curl -LsSf https://astral.sh/uv/install.sh | sh`
- On Windows: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`

## 2. Authenticate
Run this command in your terminal to log in to Google:
```bash
uvx adloop init
```
*Your browser will open. Log in with the Google account that has access to your Google Ads and GA4.*

## 3. Verify
Run `openads doctor` to ensure the tools are ready.
Then, open OpenAds and try:
`> Audit my Google Ads account`
