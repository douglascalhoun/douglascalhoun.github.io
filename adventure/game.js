// Tile Adventure Game
// Optimized for Safari on iPhone 17

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game configuration
const TILE_SIZE = 48;
const MAP_WIDTH = 12;
const MAP_HEIGHT = 16;
const CANVAS_WIDTH = MAP_WIDTH * TILE_SIZE;
const CANVAS_HEIGHT = MAP_HEIGHT * TILE_SIZE;

// Set canvas size
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Scale canvas for mobile (if needed)
function resizeCanvas() {
    const maxWidth = Math.min(window.innerWidth - 40, CANVAS_WIDTH);
    const maxHeight = Math.min(window.innerHeight - 400, CANVAS_HEIGHT);
    const scale = Math.min(maxWidth / CANVAS_WIDTH, maxHeight / CANVAS_HEIGHT, 1);
    
    canvas.style.width = (CANVAS_WIDTH * scale) + 'px';
    canvas.style.height = (CANVAS_HEIGHT * scale) + 'px';
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Tile types
const TILES = {
    GRASS: { color: '#4CAF50', walkable: true, symbol: '🌱' },
    WATER: { color: '#2196F3', walkable: false, symbol: '💧' },
    TREE: { color: '#1B5E20', walkable: false, symbol: '🌲' },
    MOUNTAIN: { color: '#78909C', walkable: false, symbol: '⛰️' },
    SAND: { color: '#FDD835', walkable: true, symbol: '🏖️' },
    STONE: { color: '#616161', walkable: true, symbol: '🪨' },
    TREASURE: { color: '#FFD700', walkable: true, symbol: '💎', collectible: true }
};

// Game state
const game = {
    player: {
        x: 5,
        y: 7,
        symbol: '🧙',
        moves: 0
    },
    treasures: {
        collected: 0,
        total: 5
    },
    map: [],
    treasurePositions: []
};

// Generate the game map
function generateMap() {
    // Initialize with grass
    for (let y = 0; y < MAP_HEIGHT; y++) {
        game.map[y] = [];
        for (let x = 0; x < MAP_WIDTH; x++) {
            game.map[y][x] = 'GRASS';
        }
    }
    
    // Add water river
    for (let y = 0; y < MAP_HEIGHT; y++) {
        if (y !== 7 && y !== 8) {
            game.map[y][3] = 'WATER';
        }
    }
    
    // Add trees
    const treePositions = [
        [1, 2], [2, 2], [8, 3], [9, 3], [10, 3],
        [1, 10], [2, 10], [8, 11], [9, 11], [10, 11],
        [0, 5], [11, 5], [0, 6], [11, 6]
    ];
    treePositions.forEach(([x, y]) => {
        game.map[y][x] = 'TREE';
    });
    
    // Add mountains
    const mountainPositions = [
        [5, 1], [6, 1], [7, 1],
        [5, 14], [6, 14], [7, 14]
    ];
    mountainPositions.forEach(([x, y]) => {
        game.map[y][x] = 'MOUNTAIN';
    });
    
    // Add sand patches
    const sandPositions = [
        [9, 7], [10, 7], [9, 8], [10, 8]
    ];
    sandPositions.forEach(([x, y]) => {
        game.map[y][x] = 'SAND';
    });
    
    // Add stone path
    for (let x = 4; x < 8; x++) {
        game.map[7][x] = 'STONE';
        game.map[8][x] = 'STONE';
    }
    
    // Add treasures
    const treasureSpots = [
        [1, 1], [10, 1], [1, 14], [10, 14], [6, 10]
    ];
    treasureSpots.forEach(([x, y]) => {
        game.map[y][x] = 'TREASURE';
        game.treasurePositions.push({ x, y });
    });
}

// Draw the game
function draw() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw tiles
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const tileType = TILES[game.map[y][x]];
            
            // Draw tile background
            ctx.fillStyle = tileType.color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            // Draw tile border
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            
            // Draw tile symbol
            ctx.font = '24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                tileType.symbol,
                x * TILE_SIZE + TILE_SIZE / 2,
                y * TILE_SIZE + TILE_SIZE / 2
            );
        }
    }
    
    // Draw player with glow effect
    const playerX = game.player.x * TILE_SIZE + TILE_SIZE / 2;
    const playerY = game.player.y * TILE_SIZE + TILE_SIZE / 2;
    
    // Glow effect
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.player.symbol, playerX, playerY);
    ctx.shadowBlur = 0;
}

// Move player
function movePlayer(dx, dy) {
    const newX = game.player.x + dx;
    const newY = game.player.y + dy;
    
    // Check bounds
    if (newX < 0 || newX >= MAP_WIDTH || newY < 0 || newY >= MAP_HEIGHT) {
        return false;
    }
    
    // Check if tile is walkable
    const targetTile = game.map[newY][newX];
    const tileType = TILES[targetTile];
    
    if (!tileType.walkable) {
        return false;
    }
    
    // Move player
    game.player.x = newX;
    game.player.y = newY;
    game.player.moves++;
    
    // Check for treasure
    if (tileType.collectible && targetTile === 'TREASURE') {
        game.map[newY][newX] = 'GRASS';
        game.treasures.collected++;
        
        // Victory check
        if (game.treasures.collected === game.treasures.total) {
            setTimeout(() => {
                alert(`🎉 Victory! You collected all treasures in ${game.player.moves} moves!`);
                resetGame();
            }, 100);
        }
    }
    
    // Update UI
    updateStats();
    draw();
    return true;
}

// Update stats display
function updateStats() {
    document.getElementById('moves').textContent = game.player.moves;
    document.getElementById('treasures').textContent = 
        `${game.treasures.collected} / ${game.treasures.total}`;
}

// Reset game
function resetGame() {
    game.player.x = 5;
    game.player.y = 7;
    game.player.moves = 0;
    game.treasures.collected = 0;
    game.treasurePositions = [];
    generateMap();
    updateStats();
    draw();
}

// Handle button controls
document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const dir = btn.dataset.dir;
        handleDirection(dir);
    });
});

// Handle keyboard controls (for desktop testing)
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
    if (dir) {
        e.preventDefault();
        handleDirection(dir);
    }
});

// Handle swipe gestures
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
}, { passive: true });

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const minSwipeDistance = 30;
    
    // Determine primary direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (Math.abs(deltaX) > minSwipeDistance) {
            handleDirection(deltaX > 0 ? 'right' : 'left');
        }
    } else {
        // Vertical swipe
        if (Math.abs(deltaY) > minSwipeDistance) {
            handleDirection(deltaY > 0 ? 'down' : 'up');
        }
    }
}

function handleDirection(dir) {
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

// Initialize game
generateMap();
updateStats();
draw();

console.log('🎮 Tile Adventure loaded! Swipe or use arrows to move.');
