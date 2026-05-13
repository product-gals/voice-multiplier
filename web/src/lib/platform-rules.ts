import { Target } from "@/lib/voice-profile";

export const PLATFORM_RULES: Record<Target, string> = {
  x: `
PLATFORM: X (Twitter)

HARD CONSTRAINTS
- 280 chars per tweet (single or thread)
- No links in body (move essential links to a reply tweet)
- No hashtags

LENGTH TARGET
- Single tweet: 150-220 chars
- Thread: 3-5 tweets max. Never more than 5.

DEFAULT DECISION
Single tweet unless source has 3+ load-bearing beats that can't be cut.
If threading, always also offer the single-tweet version as recommended.

HOOK PATTERNS (priority order)
1. Specific number / claim
2. Conventional wisdom + flip
3. First-person admission
4. Counterintuitive observation

FORBIDDEN
- Question openers ("Have you ever...")
- "Thread 🧵" / "1/" annotations on opener
- Vague openers ("Some thoughts on...")
- Verbatim LinkedIn opener
- "but" / "however" connectors (waste characters)

STRUCTURE
Two beats max: hook + turn. Connected by period or line break.

DROP FROM SOURCE
All proof points except the sharpest one. Soft openers. Restatements.
Summary closings. Links. @ mentions.

VOICE MODULATION
Sharper than source. Form forces compression.

MISFIT SIGNAL
Source needs 6+ tweets to land, OR is a numeric breakdown that loses
meaning when compressed.
`.trim(),

  threads: `
PLATFORM: Threads

HARD CONSTRAINTS
- 500 chars per post
- Links allowed (no algo penalty)
- No hashtags

LENGTH TARGET
- 60-120 words
- 1-2 short paragraphs, blank line between

FORMAT
- Line breaks inside paragraphs for rhythm
- No headlines
- Bold reads as shouty — avoid

HOOK PATTERNS
- Observation opener
- Quiet contrarian
- First-person scene-setting
- Direct address to a niche

FORBIDDEN
- "Hot take:" / "Unpopular opinion:" prefixes
- Numbered lists (use line breaks)
- Marketing-deck phrasing
- Verbatim LinkedIn opener

DROP FROM SOURCE
All but one proof point. Carousel cues. LinkedIn CTAs ("follow for more").
"Comment X for the doc" mechanics.

VOICE MODULATION
"Thinking out loud" energy. Reader is overhearing a half-finished thought.

MISFIT SIGNAL
Rare. Flag only if source is pure tactical list with no narrative.
`.trim(),

  substack_note: `
PLATFORM: Substack Note

HARD CONSTRAINTS
- No hard char limit, but anything over 3 lines breaks the form
- No headline (first line IS the title)
- No CTAs

LENGTH TARGET
- 30-70 words total
- 1-3 lines max, each on its own with a blank line between

FORMAT
- One thought per line
- No paragraphs (visual difference vs Threads)

HOOK PATTERNS
- Statement that sounds wrong at first
- Compressed scene
- Counterintuitive frame
- Confession

FORBIDDEN
- "I've been thinking about..."
- "Quick thought:"
- Question openers
- Anything that needs setup to land

STRUCTURE
- Line 1 = the whole point
- Line 2 (optional) = the proof or the turn
- Line 3 (rare) = the rest

DROP FROM SOURCE
All proof points except one. Setup. Conclusion. Lists. CTAs. Hashtags.

VOICE MODULATION
Reader overhears a notebook entry. Mid-thought, lightly polished. Confident
but not finished.

MISFIT SIGNAL
Source requires all its proof to land. Can't compress to one beat.
`.trim(),

  instagram: `
PLATFORM: Instagram caption

HARD CONSTRAINTS
- 2200 char cap, but only first ~125 chars show before "more" cut
- Links don't work in captions
- 4-8 hashtags (more reads try-hard, fewer leaves reach on table)

LENGTH TARGET
- 80-160 words

FORMAT
- Aggressive line breaks (single sentences on their own line)
- 3-6 short paragraphs in body
- Hashtag block at bottom after 2-3 line breaks
- No inline hashtags

HOOK RULES (first 125 chars MUST work as preview)
- Statement that demands the click
- Specific number that needs context
- First-person admission

FORBIDDEN
- Question openers ("Ever wonder why...")
- "Read this if..." framings
- "Story time:" intros
- "Double tap if you agree" CTAs

HASHTAG STRATEGY (4-8 total, mixed tiers)
- 2 niche tags (10K-500K posts each)
- 2 mid tags (500K-5M)
- 1-2 broad tags (5M+)
- Optional 1-2 brand tags
- Never: #instagood #love #inspiration #ai #fyp #viral

VISUAL PAIRING RECOMMENDATION (include in output)
- Story source → single image post
- Tactical source → carousel (5-10 slides)
- Numbers source → quote card
- Dense abstract argument → IG is poor fit, flag this

DROP FROM SOURCE
Bullets and numbered lists. B2B jargon — soften or explain. Links.
"Follow for more" CTAs.

VOICE MODULATION
Warmer than source. Slightly more vulnerable. Stories breathe more.

MISFIT SIGNAL
Dense abstract argument with no visual anchor.
`.trim(),

  tiktok: `
PLATFORM: TikTok script

HARD CONSTRAINT (different from the others)
The output is NOT a post — it's a script for a video the user will read aloud.
Cadence matters more than syntax.

FORMAT (default: talking head)
Output as structured text with these labeled sections:

HOOK: [first 3 sec, ~10 words. Pattern interrupt.]
BODY: [15-35 sec, 50-110 words. Thesis + 1 proof point.]
CLOSE: [last 5 sec, ~10-15 words. No CTA.]
PRODUCTION NOTES: [optional — framing / b-roll / on-screen text]

LENGTH TARGET
30-45 sec spoken (75-110 words). 60 sec only if source payload is heavy.

HOOK PATTERNS
- Specific number / claim
- Counterintuitive open
- First-person reveal
- Direct address

FORBIDDEN
- "Hey guys" / "What's up" openers
- "Today I'm going to tell you about..."
- "Three things: one, two, three" (bake structure into prose)

CAPTION (the text under the video — include after CLOSE)
CAPTION: [1-2 short sentences echoing the hook, plus 2-4 niche hashtags]
Never #fyp #viral #foryoupage

VOICE MODULATION
Spoken cadence. Must pass "would I actually say this at a coffee shop?"
Contractions mandatory.

MISFIT SIGNAL
Source has no clear story / hook / specific.
`.trim(),
};
