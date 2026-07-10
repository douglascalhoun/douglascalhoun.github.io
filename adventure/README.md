# Tile Adventure Game

A mobile-friendly tile-based adventure game optimized for Safari on iPhone 17.

## Features

- 🗺️ **Tile-based world** with 12x16 grid
- 🧙 **Adventurer character** you control
- 💎 **5 treasures** to collect scattered across the map
- 🌲 **Various terrain types**: grass, water, trees, mountains, sand, stone paths
- 📱 **Mobile-optimized** with touch controls
- 👆 **Swipe gestures** for natural movement
- 🎯 **Button controls** for precise movement

## How to Play

1. **Goal**: Collect all 5 treasures (💎) scattered across the map
2. **Movement**: 
   - Swipe on the game board to move your adventurer
   - Tap the arrow buttons below the board
   - Use arrow keys or WASD (for desktop testing)
3. **Rules**:
   - You can walk on grass 🌱, sand 🏖️, stone 🪨, and treasure tiles
   - You cannot walk through water 💧, trees 🌲, or mountains ⛰️
   - Collect treasures by walking over them
4. **Win**: Find and collect all 5 treasures!

## Terrain Guide

- 🌱 **Grass** - walkable
- 💧 **Water** - blocks movement
- 🌲 **Trees** - blocks movement
- ⛰️ **Mountains** - blocks movement  
- 🏖️ **Sand** - walkable
- 🪨 **Stone Path** - walkable
- 💎 **Treasure** - walkable, collectible

## Running the Game

### Option 1: Direct File
Simply open `index.html` in Safari on your iPhone 17

### Option 2: Development Server
From the root project directory:

```bash
npm run dev
```

Then navigate to `http://localhost:5173/adventure/` on your device

### Option 3: Standalone Server
Use any simple HTTP server in the adventure folder:

```bash
cd adventure
python3 -m http.server 8000
```

Then visit `http://your-ip:8000` on your iPhone

## Mobile Optimization

- Touch-friendly controls
- Swipe gesture detection
- Responsive canvas sizing
- Optimized for Safari iOS
- No scrolling or zooming interference
- Large tap targets for buttons

## Game Stats

- **Moves**: Tracks how many moves you've made
- **Treasures**: Shows collected vs total treasures

Try to collect all treasures in the fewest moves possible! 🎮
