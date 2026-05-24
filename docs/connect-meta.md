# Connecting Meta Ads

OpenAds connects to Meta (Facebook/Instagram) using Meta's official hosted MCP. There is no code to install!

## 1. Get Your Access Token
Go to the Meta Business Manager, create a System User, and generate an Access Token with the `ads_read` and `ads_management` permissions.

## 2. Authenticate
Run the setup wizard in your terminal:
```bash
openads setup
```
When asked "Connect Meta Ads?", press `Y` and paste your Access Token.

## 3. Verify
Launch the agent by typing `openads`. You should see `Meta ✓ Connected` in the splash screen.
You can now type:
`> What's my best performing Meta creative this month?`
