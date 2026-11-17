# Articles of Faith Jumble

A phone-first word puzzle PWA for Griggware, based on the 13 LDS Articles of Faith.

## Gameplay

- Select Article 1 through Article 13 from an index.
- Drag scattered tiles around a full-screen assembly mat.
- Each tile contains a fixed chunk of lowercase text with spaces and punctuation removed.
- Correct consecutive tiles or assembled groups snap together when their matching ends are close enough.
- Joins are permanent; incorrect neighbors produce no response.
- Merged groups restore internal word spacing, retain partial words at their outer edges, and wrap into taller tiles.
- Completing an article reveals its full capitalization and punctuation, with Replay and Return to Articles actions.
- Completion marks persist in local storage. Unfinished arrangements are discarded when leaving an article.

## Direction

React and TypeScript PWA, with potential iOS and Android packaging through Capacitor later. Implementation has not started.

Article text and ordered, provisional chunks will live in a replaceable configuration file. Original chunk sets can be substituted when recovered.

Phone support comes first, followed by desktop and tablet layouts.
