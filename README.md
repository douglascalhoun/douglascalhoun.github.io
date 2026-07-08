# Space Nova

A simplified browser-based remake of Escape Velocity Nova.

## Live

https://douglascalhoun.github.io/

## Phase 4 Status

- Dual-thumb flight controls (turn + thrust)
- Momentum physics, planet, system boundary
- Space station docking with Trade + Upgrades tabs
- Combat: player weapons, fighter NPCs that shoot back
- Shields / hull with regen and station repair
- Credits, cargo, and station buy/sell trading
- Ship upgrades: Engines, Shields, Hull, Weapons, Cargo (5 levels each)
- Respawn keeps credits, cargo, kills, and upgrades

## Controls

- **Left joystick**: turn
- **Right joystick**: thrust
- **FIRE** button or **Space**: shoot
- **DOCK** button or **D**: dock / undock near station

## Dev

```bash
npm install
npm run dev
npm run build:pages
```

`build:pages` builds from `index.source.html` and syncs `index.html` + `assets/` for GitHub Pages.
