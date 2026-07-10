# Worldwire Editorial Policy

## Positioning
Worldwire is not a general news firehose. It surfaces **high-impact technology progress** first—especially AI and VR/software—plus only the most consequential geopolitics and business moves.

## Source mix
### Core (always on)
- AI labs & analysis: OpenAI, Google AI, DeepMind, MIT Tech Review, Verge AI, VentureBeat AI
- Broad tech signal: Ars Technica, TechCrunch, Wired, IEEE Spectrum, Hacker News
- VR/spatial: UploadVR, Road to VR

### Selective
- Business with tech gravity: Bloomberg Technology (when available)
- Geopolitics: BBC World only (heavily filtered)

### Retired from default
CNN, NPR homepage, NYT homepage/world flood, WaPo, Al Jazeera all-feed, Guardian world flood, SCMP, Japan Times, Spiegel, El País, Reuters (broken), AP via rsshub

## Filtering model
Each article gets a relevance score at ingest:

| Signal | Effect |
|---|---|
| AI / VR / breakthrough tech terms | Strong boost |
| First-order conflict / landmark events | Boost |
| Hard pop-culture / celebrity / sports fluff | Hard reject |
| Incremental politics ("says", "live updates", "reacts") | Strong demote |
| World/business without tech or major-event signal | Demote |

### Thresholds
- **Feed keep:** score ≥ 12
- **Push notify:** score ≥ 28
- Default max pushes/hour: **12**

## Intent examples
Keep:
- "OpenAI releases new multimodal model"
- "Meta ships major Quest OS update for spatial apps"
- "US launches strikes on Iran" (initial major event)
- "Nvidia unveils next-gen AI GPU architecture"

Drop:
- Celebrity divorces / awards chatter
- "Minister responds to criticism over..."
- Live blogs / minute-by-minute war updates
- Polling minutiae and campaign fundraising
