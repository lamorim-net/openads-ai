# Connecting Meta Ads

OpenAds connects to Meta (Facebook/Instagram) using Meta's official hosted MCP. There is no code to install!

## 1. Get Your Access Token
1. Go to [Meta Business Settings](https://business.facebook.com/settings/system-users).
2. Click **Add** to create a new System User (or select an existing one).
3. Click **Add Assets**, select your Ad Accounts, and grant "Manage Campaigns" permission.
4. Under "Add Assets" -> "Apps", assign a Meta Developer App (Create a basic one at developers.facebook.com if needed).
5. Click **Generate New Token** and select your App.
6. Check the boxes for `ads_read` and `ads_management` permissions.
7. Click Generate and copy the long token string.

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
