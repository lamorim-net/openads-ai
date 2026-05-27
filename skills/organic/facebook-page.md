---
name: facebook-page-organic
description: Draft and publish organic posts to a connected Facebook Page. Use the get_facebook_page_posts and post_to_facebook_page tools when available.
---

# Facebook Page Organic Posting

## When to Use
Activate when the user wants to post to Facebook, draft organic Facebook content, review posting history, or plan their Facebook Page content calendar.

Requires `facebookPageToken` and `facebookPageId` configured via `openads setup`.

---

## Before Drafting Any Post

1. Call `get_facebook_page_posts` (limit: 10) to review what's been published recently
2. Check for repeated topics, posting cadence, and tone patterns
3. Never write a post that echoes a theme from the last 3 posts — deconflict first

---

## Facebook Post Rules

- **40–80 words** for feed posts — shorter than LinkedIn, punchier than a blog
- **Lead with the hook** — first line must earn the stop before "See More"
- **Questions and "tag someone" prompts** drive comments, which drive algorithmic reach
- **No link in post body** if reach matters — attach via the `link` parameter or suggest putting it in comments
- Organic reach on Pages is ~2–5% of followers — write content people want to *share*

## What NOT to Do
- Don't start with the brand name or "Excited to announce"
- Don't paste the same copy from Instagram or LinkedIn — adapt for platform
- No hard CTA (buy, sign up) on organic — soft close or question only

---

## Output Format

**Post:**
[Post text — 40–80 words, hook first]

**Link (optional):** [URL to attach as link preview]

**Pillar:** [Education | Social Proof | Culture | POV]

**Ready to publish** via `post_to_facebook_page` — confirm when ready.
