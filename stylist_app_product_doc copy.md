# Product Doc: Daily Stylist App (v1)

## 1. Problem Statement

Every morning, deciding what to wear from an existing wardrobe takes time and mental energy — even with a great closet, it's easy to default to the same 5 outfits. This app removes that friction: it looks at what she owns, suggests a complete outfit each day with a visual of how it looks together, and lets her regenerate if she wants something different. Over time, it also flags new/sale items from her favourite stores (Zara, H&M, Myntra) that would genuinely complement her existing wardrobe.

## 2. Goals (v1)

1. Digitize her wardrobe — each item photographed, tagged (category, color, fabric, season).
2. Every day, generate one complete outfit suggestion (top + bottom/dress + layering + accessories) from her wardrobe.
3. Show a flat-lay style image of the suggested look so she can see how pieces combine.
4. Let her tap "Generate another" for a different combination.
5. Mobile-friendly (PWA) — opens like an app from her home screen, no app store needed.

## 3. Non-Goals (v1)

- No virtual try-on / photo of her wearing it (future consideration)
- No automatic purchase/checkout integration
- No social sharing or multi-user features
- No laundry/wear-tracking automation (could be v2)

## 4. Core User Flows

### Flow A — Wardrobe Setup (one-time + ongoing)
1. She opens the app, taps "Add item"
2. Takes/uploads a photo of a clothing item (ideally on a hanger or flat surface)
3. AI auto-tags: category (top/bottom/dress/outerwear/shoes/accessory), color, pattern, fabric guess, formality level
4. She can correct/confirm tags, optionally add notes ("gift from mom", "needs dry clean")
5. Item saved to her digital wardrobe (grid view, filterable by category/color)

**Seed data:** We already have ~20 items from her Zara/H&M order history (with item names, colors, sizes) — we can pre-populate these as a starting wardrobe so the app isn't empty on day one. She'd still need to photograph these for the visual database, but the metadata is ready.

### Flow B — Daily Look
**Style direction:** Combinations aren't random pairings — the suggestion logic is grounded in her style profile (relaxed feminine, coastal casual, soft neutrals/pastels, flowing silhouettes) derived from her purchase history and the influencer references she's given (cailinmandapat, ciarakeva, alishajain_05, hannah.thinking). This profile guides which items get paired together and the styling of the flat-lay image, so suggestions feel like "her" rather than generic outfit math.

1. Each morning (or on open), the app shows "Today's Look" — a flat-lay style image combining 3-5 items from her wardrobe
2. Below the image: list of the actual items used (so she can locate them in her closet)
3. Optional: weather-aware (pulls Bangalore weather, avoids suggesting heavy layers on hot days)
4. Button: "Generate another look" — produces a different combination + new flat-lay image
5. Button: "Love this" / "Not for me" — feedback loop to improve future suggestions

### Flow C — Shopping Suggestions (later phase, stubbed in v1)
1. Separate tab: "For You" — periodically refreshed picks from Zara/H&M/Myntra sale sections
2. Each suggestion shows why it was picked ("pairs well with your beige trousers", "fills your blazer gap")
3. Links out to the product page (no checkout integration)

## 5. Feature Scope by Phase

### Phase 1 (MVP — this build)
- Wardrobe digitization: photo upload + AI auto-tagging + manual correction
- Wardrobe grid view (browse/filter by category, color)
- Daily look generator: rule-based + AI combination logic from tagged wardrobe
- Flat-lay image generation for the suggested look
- "Generate another" regeneration
- PWA shell — installable on her phone home screen

### Phase 2 (Next)
- Weather-aware suggestions (Bangalore weather API)
- Occasion-based requests ("suggest something for a dinner out")
- Wear history tracking (mark an outfit as "worn today")
- "For You" shopping recommendations tab (sale alerts from Zara/H&M/Myntra)

### Phase 3 (Future)
- Virtual try-on (her photo + outfit overlay)
- Packing list generator for trips
- Shareable lookbook / outfit calendar

## 6. Image Generation Approach

**Flat-lay/collage style** (chosen): For each suggested look, generate a clean, visually polished flat-lay image showing the selected items arranged together (e.g., top laid above bottom, shoes below, accessories to the side) on an aesthetically styled background — the kind of image you'd see on a fashion mood board, not a plain photo dump.

**Recommendation:** Use AI image generation, prompted with the specific items from her wardrobe (their color, type, pattern from the tagged metadata, plus her actual item photos as visual reference where the model supports image input), to produce a styled flat-lay each time. A plain slideshow/collage of her uploaded photos would feel like a chore, not inspiration — the goal is for the image itself to make her want to wear the look. AI generation gives us editorial-quality styling.

**Future (Phase 3):** Generate the look on an avatar resembling her, so she can see it on a body rather than just laid flat — this is the natural next step once the wardrobe data and generation pipeline are solid.

## 7. Wardrobe Input Approach

**Photo upload + AI tagging** (chosen):
- She photographs each item (one-time effort, can be spread over days)
- AI vision model auto-detects: category, color(s), pattern, approximate fabric, formality (casual/work/occasion)
- She reviews/edits tags before saving
- Seed data from Zara/H&M order history pre-fills ~20 items' metadata (she'd just need to add photos for these to complete them)

## 8. Platform: Mobile Web App (PWA)

- Built as a responsive web app, "Add to Home Screen" gives an app-like icon and full-screen experience on iOS/Android
- No app store submission/approval needed — instant updates
- Daily reminder via web push notification (where supported) or a simple "check each morning" habit
- Hosting: lightweight — can run on a simple cloud host; data stored per-user (just her, single-user app for v1)

## 9. Open Questions for Your Review

1. **Wardrobe photo effort:** Onboarding will cover ~30 key items. ✅ Confirmed.
2. **Daily trigger:** Look appears only when she opens the app (no push notification). ✅ Confirmed.
3. **Accounts/access:** Two users — her and you. ✅ Confirmed.
4. **Hosting/login:** Simple passcode/PIN access for both users. ✅ Confirmed.
5. **Shopping integration timing:** Deferred to Phase 2. ✅ Confirmed.

---

Once you review and adjust this, I'll put together the engineering plan (data model, tech stack, build steps) for your approval before any implementation starts.
