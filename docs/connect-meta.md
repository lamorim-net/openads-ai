# Connecting Meta Ads

OpenAds connects to Meta (Facebook/Instagram) using Meta's official hosted MCP. There is no code to install!

## 1. Get Your Access Token
1. Create a basic App at [developers.facebook.com](https://developers.facebook.com/).
2. In [Meta Business Settings](https://business.facebook.com/settings), go to **Accounts -> Apps** and click **Add** to connect your App.
3. Go to **Users -> System Users** and click **Add** to create a new user (Role: Employee).
4. Click **Add Assets**. Under **Apps**, assign your App. Under **Ad Accounts**, assign your Ad Accounts (with Manage Campaigns permission).
5. Click **Generate New Token**, select your App, and check the `ads_read` and `ads_management` boxes.
6. Click Generate and copy the long token string.

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
