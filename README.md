# Ananya & Nemish — Wedding Invitation

A responsive, multi-page wedding invitation for **2–3 February 2027** at **Happy Retreats KAI**, Agalagurki, Chikkaballapur, Karnataka, near Bengaluru.

## Pages
- `index.html` — opening envelope, monogram, invitation home, countdown, event navigation, family names, venue and directions, and illustrated personal-moments panel
- `haldi.html` — Haldi timing, decor palette with hex codes, guest dress palette with hex codes, and event details
- `mehendi.html` — Mehendi and acoustic Sufi night timing, decor palette with hex codes, guest dress palette with hex codes, and event details
- `wedding.html` — baraat, welcome, varmala, Saat Phere schedule, muhurat, decor palette with hex codes, and guest dress palette with hex codes

## Shared assets
- `styles.css` — shared editorial floral styling, responsive layouts, typography and transitions
- `script.js` — opening interaction, scroll reveals, countdown, mobile navigation and the same ambient sound control on every page
- `assets/monogram.svg` — custom interlocking A/N symbol
- `assets/floral-corners.svg` — botanical corner ornaments
- `assets/haldi-scene.svg`, `assets/mehendi-scene.svg`, `assets/wedding-scene.svg` — original vector event illustrations
- `assets/moments-illustration.svg` — original illustrated motifs inspired by the mountain proposal and Jaipur architecture

## Interaction and accessibility
- Reloading the home page returns to the opening invitation; pressing “Open your invitation” starts at the top.
- All invitation copy is regular HTML text and remains selectable; the script font is typography, not text baked into an image.
- The ambient score is generated locally in the browser and starts only after a guest taps Sound. A sound toggle is present on every page.
- The website respects reduced-motion preferences.

## Venue
The primary Maps button uses the full Google Maps place URL supplied by the couple. A separate directions URL is provided as a fallback.

## RSVP and guestbook
The visual RSVP area is intentionally marked as pending. Google Sheets-backed RSVP storage and the moderated guestbook still need a backend connection before guests can submit responses.
