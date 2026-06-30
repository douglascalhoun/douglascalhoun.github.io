// Tile Adventure Game - Scrolling World Edition
// Optimized for Safari on iPhone 17

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game configuration
const TILE_SIZE = 64; // Larger tiles for mobile
const WORLD_WIDTH = 40; // Large explorable world
const WORLD_HEIGHT = 40;

// Canvas fills the screen
let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

// Calculate visible tiles
let tilesX = Math.ceil(canvasWidth / TILE_SIZE) + 2;
let tilesY = Math.ceil(canvasHeight / TILE_SIZE) + 2;

// Handle window resize
function resizeCanvas() {
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    tilesX = Math.ceil(canvasWidth / TILE_SIZE) + 2;
    tilesY = Math.ceil(canvasHeight / TILE_SIZE) + 2;
    draw();
}

window.addEventListener('resize', resizeCanvas);

// Tile types - only emoji and colors
const TILES = {
    GRASS: { color: '#4CAF50', walkable: true, emoji: '🌱' },
    WATER: { color: '#1976D2', walkable: false, emoji: '💧' },
    TREE: { color: '#2E7D32', walkable: false, emoji: '🌲' },
    MOUNTAIN: { color: '#607D8B', walkable: false, emoji: '⛰️' },
    SAND: { color: '#FBC02D', walkable: true, emoji: '🏖️' },
    STONE: { color: '#757575', walkable: true, emoji: '🪨' },
    TREASURE: { color: '#FFD700', walkable: true, emoji: '💎', collectible: true },
    FLOWER: { color: '#81C784', walkable: true, emoji: '🌸' }
};

// Game state
const game = {
    player: {
        x: 20, // Start in middle of world
        y: 20,
        emoji: '🧙',
    },
    camera: {
        x: 20,
        y: 20,
    },
    treasures: {
        collected: 0,
        total: 10
    },
    world: [],
    treasurePositions: [],
    started: false
};

// Generate procedural world
function generateWorld() {
    // Initialize with grass
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        game.world[y] = [];
        for (let x = 0; x < WORLD_WIDTH; x++) {
            game.world[y][x] = 'GRASS';
        }
    }
    
    // Add water bodies (lakes and rivers)
    // Horizontal river
    for (let x = 0; x < WORLD_WIDTH; x++) {
        game.world[10][x] = 'WATER';
        game.world[11][x] = 'WATER';
    }
    
    // Vertical river
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        if (y < 10 || y > 11) { // Don't overlap horizontal river
            game.world[y][15] = 'WATER';
        }
    }
    
    // Add bridges (stone crossings)
    game.world[10][20] = 'STONE';
    game.world[11][20] = 'STONE';
    game.world[10][5] = 'STONE';
    game.world[11][5] = 'STONE';
    game.world[10][30] = 'STONE';
    game.world[11][30] = 'STONE';
    
    for (let x = 14; x <= 16; x++) {
        game.world[5][x] = 'STONE';
        game.world[25][x] = 'STONE';
    }
    
    // Add forests (trees)
    const forestAreas = [
        { cx: 5, cy: 5, radius: 3 },
        { cx: 35, cy: 5, radius: 4 },
        { cx: 5, cy: 35, radius: 3 },
        { cx: 35, cy: 35, radius: 4 },
        { cx: 20, cy: 30, radius: 2 }
    ];
    
    forestAreas.forEach(forest => {
        for (let dy = -forest.radius; dy <= forest.radius; dy++) {
            for (let dx = -forest.radius; dx <= forest.radius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= forest.radius && Math.random() > 0.3) {
                    const fx = forest.cx + dx;
                    const fy = forest.cy + dy;
                    if (fx >= 0 && fx < WORLD_WIDTH && fy >= 0 && fy < WORLD_HEIGHT) {
                        if (game.world[fy][fx] === 'GRASS') {
                            game.world[fy][fx] = 'TREE';
                        }
                    }
                }
            }
        }
    });
    
    // Add mountain ranges
    const mountains = [
        { x: 10, y: 25 }, { x: 11, y: 25 }, { x: 12, y: 25 },
        { x: 10, y: 26 }, { x: 11, y: 26 }, { x: 12, y: 26 },
        { x: 28, y: 15 }, { x: 29, y: 15 }, { x: 30, y: 15 },
        { x: 28, y: 16 }, { x: 29, y: 16 }, { x: 30, y: 16 }
    ];
    
    mountains.forEach(({ x, y }) => {
        if (game.world[y][x] === 'GRASS') {
            game.world[y][x] = 'MOUNTAIN';
        }
    });
    
    // Add sand beaches near water
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            if (game.world[y][x] === 'GRASS') {
                // Check if adjacent to water
                const adjacentToWater = 
                    (x > 0 && game.world[y][x-1] === 'WATER') ||
                    (x < WORLD_WIDTH-1 && game.world[y][x+1] === 'WATER') ||
                    (y > 0 && game.world[y-1][x] === 'WATER') ||
                    (y < WORLD_HEIGHT-1 && game.world[y+1][x] === 'WATER');
                
                if (adjacentToWater && Math.random() > 0.5) {
                    game.world[y][x] = 'SAND';
                }
            }
        }
    }
    
    // Add decorative flowers
    for (let i = 0; i < 50; i++) {
        const x = Math.floor(Math.random() * WORLD_WIDTH);
        const y = Math.floor(Math.random() * WORLD_HEIGHT);
        if (game.world[y][x] === 'GRASS') {
            game.world[y][x] = 'FLOWER';
        }
    }
    
    // Place treasures in interesting locations
    const treasureSpots = [
        { x: 2, y: 2 }, { x: 37, y: 2 }, { x: 2, y: 37 }, { x: 37, y: 37 }, // Corners
        { x: 20, y: 2 }, { x: 20, y: 37 }, // Top and bottom center
        { x: 2, y: 20 }, { x: 37, y: 20 }, // Left and right center
        { x: 25, y: 25 }, { x: 15, y: 18 } // Interior locations
    ];
    
    treasureSpots.forEach(({ x, y }) => {
        if (TILES[game.world[y][x]].walkable) {
            game.world[y][x] = 'TREASURE';
            game.treasurePositions.push({ x, y });
        }
    });
}

// Camera follows player smoothly
function updateCamera() {
    game.camera.x = game.player.x;
    game.camera.y = game.player.y;
}

// Draw the visible world with camera offset
function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Calculate camera offset to center player
    const offsetX = canvasWidth / 2 - game.camera.x * TILE_SIZE;
    const offsetY = canvasHeight / 2 - game.camera.y * TILE_SIZE;
    
    // Calculate visible tile range
    const startX = Math.max(0, Math.floor(game.camera.x - tilesX / 2));
    const endX = Math.min(WORLD_WIDTH, Math.ceil(game.camera.x + tilesX / 2));
    const startY = Math.max(0, Math.floor(game.camera.y - tilesY / 2));
    const endY = Math.min(WORLD_HEIGHT, Math.ceil(game.camera.y + tilesY / 2));
    
    // Draw visible tiles
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const tileType = TILES[game.world[y][x]];
            const screenX = x * TILE_SIZE + offsetX;
            const screenY = y * TILE_SIZE + offsetY;
            
            // Draw tile background
            ctx.fillStyle = tileType.color;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            
            // Draw subtle grid
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            
            // Draw emoji centered in tile
            ctx.font = `${TILE_SIZE * 0.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                tileType.emoji,
                screenX + TILE_SIZE / 2,
                screenY + TILE_SIZE / 2
            );
        }
    }
    
    // Draw player at center with glow
    const playerScreenX = canvasWidth / 2;
    const playerScreenY = canvasHeight / 2;
    
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${TILE_SIZE * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.player.emoji, playerScreenX, playerScreenY);
    ctx.shadowBlur = 0;
}

// Move player in the world
function movePlayer(dx, dy) {
    const newX = game.player.x + dx;
    const newY = game.player.y + dy;
    
    // Check world bounds
    if (newX < 0 || newX >= WORLD_WIDTH || newY < 0 || newY >= WORLD_HEIGHT) {
        return false;
    }
    
    // Check if tile is walkable
    const targetTile = game.world[newY][newX];
    const tileType = TILES[targetTile];
    
    if (!tileType.walkable) {
        return false;
    }
    
    // Move player
    game.player.x = newX;
    game.player.y = newY;
    
    // Update camera to follow player
    updateCamera();
    
    // Check for treasure
    if (tileType.collectible && targetTile === 'TREASURE') {
        game.world[newY][newX] = 'GRASS';
        game.treasures.collected++;
        
        // Victory check
        if (game.treasures.collected === game.treasures.total) {
            setTimeout(() => {
                alert(`🎉 Victory! You found all ${game.treasures.total} treasures!`);
                resetGame();
            }, 100);
        }
    }
    
    // Update UI
    updateHUD();
    draw();
    return true;
}

// Update HUD display
function updateHUD() {
    document.getElementById('treasures').textContent = 
        `${game.treasures.collected} / ${game.treasures.total}`;
    document.getElementById('position').textContent = 
        `${game.player.x}, ${game.player.y}`;
}

// Reset game
function resetGame() {
    game.player.x = 20;
    game.player.y = 20;
    game.treasures.collected = 0;
    game.treasurePositions = [];
    generateWorld();
    updateCamera();
    updateHUD();
    draw();
}

// Handle button controls
document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        if (dir) handleDirection(dir);
    });
});

// Handle keyboard controls
document.addEventListener('keydown', (e) => {
    const keyMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',
        'w': 'up',
        's': 'down',
        'a': 'left',
        'd': 'right'
    };
    
    const dir = keyMap[e.key];
    if (dir && game.started) {
        e.preventDefault();
        handleDirection(dir);
    }
});

// Handle swipe gestures on entire canvas
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    if (game.started) {
        handleSwipe();
    }
}, { passive: true });

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;
    
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    
    // Determine primary direction
    if (absX > absY && absX > minSwipeDistance) {
        handleDirection(deltaX > 0 ? 'right' : 'left');
    } else if (absY > absX && absY > minSwipeDistance) {
        handleDirection(deltaY > 0 ? 'down' : 'up');
    }
}

function handleDirection(dir) {
    if (!game.started) return;
    
    switch(dir) {
        case 'up':
            movePlayer(0, -1);
            break;
        case 'down':
            movePlayer(0, 1);
            break;
        case 'left':
            movePlayer(-1, 0);
            break;
        case 'right':
            movePlayer(1, 0);
            break;
    }
}

// Start game
document.getElementById('start-btn').addEventListener('click', () => {
    game.started = true;
    document.getElementById('title').classList.add('hidden');
});

// Initialize game
generateWorld();
updateCamera();
updateHUD();
draw();

console.log('🗺️ Tile Adventure loaded! Explore the scrolling world!');
console.log(`World size: ${WORLD_WIDTH}x${WORLD_HEIGHT} tiles`);
