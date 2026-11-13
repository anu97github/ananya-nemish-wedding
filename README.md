# Ananya & Nemish — Wedding Invitation

A single-page, mobile-responsive wedding invitation for 2–3 February 2027 at Happy Retreats KAI, Agalagurki, Chikkaballapur, Karnataka.

## Visitor flow
- Opening invitation and couple names
- Countdown
- Family blessings and parent details
- Venue, Google Maps and accommodation details
- Three vertically stacked celebration sections: Haldi, Mehendi & Acoustic Music, and Wedding
- Four guest dress-code colours with hex codes for each event
- Minimal RSVP preview form

## Design and assets
- Two type families only: Allura for couple names and selected calligraphic accents; Montserrat for all other content
- Original AN logo traced from the supplied monogram artwork
- Botanical corner ornament and illustrated event scenes
- Warm ivory, antique gold, muted olive and dusty rose palette

## Soundtrack
The sound toggle initiates the official YouTube audio embed after a visitor tap. The player is kept visually hidden; no pop-up or video panel is shown. Browser autoplay policies can prevent sound from starting without a user gesture.

## RSVP
The RSVP validates and previews responses in the browser only. It does not transmit or store guest responses until connected to a secure data destination.

## Files
- `index.html` — complete single-page invitation
- `styles.css` — responsive visual system
- `script.js` — navigation, countdown, sound control and RSVP preview
- `assets/monogram.svg` — supplied interlocked AN mark, traced as vector
- `assets/floral-corners.svg` — botanical ornament
- `assets/*-scene.svg` — event illustrations
- `haldi.html`, `mehendi.html`, `wedding.html` — compatibility redirects to event sections
