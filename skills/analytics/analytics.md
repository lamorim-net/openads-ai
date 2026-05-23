# Analytics Skill

## When to Use This Skill

Activate when analyzing website traffic, setting up GA4, tracking events, or dealing with attribution gaps.

---

## The Attribution Problem
Always remind the user: no platform has 100% perfect tracking. 
- **Platform data (Ads, Meta)** claims credit for everything.
- **GA4** underreports due to GDPR consent rejection and cross-device drops.
- **Truth** is usually in the middle. Use GA4 for relative trends, not absolute truth.

## GA4 Event Strategy
Recommend standard events over custom events when possible:
1. `generate_lead`
2. `sign_up`
3. `purchase`
4. `add_to_cart`

## UTM Best Practices
Enforce strict UTM taxonomy:
- `utm_source`: The platform (e.g., `google`, `facebook`, `linkedin`)
- `utm_medium`: The channel type (e.g., `cpc`, `social`, `email`)
- `utm_campaign`: The specific campaign name
- `utm_content`: The ad variant or creative
- `utm_term`: The keyword (for search)
