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
    FLOWER: { color: '#81C784', walkable: true, emoji: '🌸' },
    HEART: { color: '#FFE5E5', walkable: true, emoji: '❤️', collectible: true }
};

// Enemy types
const ENEMY_TYPES = {
    SLIME: { emoji: '🟢', hp: 2, damage: 1, speed: 800, color: '#4CAF50' },
    BAT: { emoji: '🦇', hp: 1, damage: 1, speed: 600, color: '#9C27B0' },
    SKELETON: { emoji: '💀', hp: 3, damage: 2, speed: 1000, color: '#757575' },
    SPIDER: { emoji: '🕷️', hp: 2, damage: 1, speed: 700, color: '#F44336' }
};

// Game state
const game = {
    player: {
        x: 20,
        y: 20,
        emoji: '🧙',
        maxHealth: 6,
        health: 6,
        facing: 'down',
        invulnerable: false,
        invulnerableUntil: 0
    },
    camera: {
        x: 20,
        y: 20,
    },
    combat: {
        attacking: false,
        attackCooldown: 0,
        attackRange: 1.5
    },
    treasures: {
        collected: 0,
        total: 10
    },
    enemies: [],
    world: [],
    treasurePositions: [],
    started: false,
    lastUpdate: Date.now(),
    animations: []
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
    
    // Place hearts for health recovery
    const heartSpots = [
        { x: 10, y: 10 }, { x: 30, y: 10 }, { x: 10, y: 30 }, { x: 30, y: 30 },
        { x: 20, y: 15 }, { x: 25, y: 20 }
    ];
    
    heartSpots.forEach(({ x, y }) => {
        if (TILES[game.world[y][x]].walkable && game.world[y][x] !== 'TREASURE') {
            game.world[y][x] = 'HEART';
        }
    });
    
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
    
    // Spawn enemies
    spawnEnemies();
}

// Spawn enemies in the world
function spawnEnemies() {
    game.enemies = [];
    
    // Spawn different enemy types
    const enemyCount = 15;
    const types = Object.keys(ENEMY_TYPES);
    
    for (let i = 0; i < enemyCount; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const enemyData = ENEMY_TYPES[type];
        
        // Find a valid spawn position (walkable, not near player)
        let x, y, attempts = 0;
        do {
            x = Math.floor(Math.random() * WORLD_WIDTH);
            y = Math.floor(Math.random() * WORLD_HEIGHT);
            const distFromPlayer = Math.sqrt((x - game.player.x) ** 2 + (y - game.player.y) ** 2);
            attempts++;
            
            if (attempts > 100) break; // Prevent infinite loop
            
        } while (
            !TILES[game.world[y][x]].walkable || 
            game.world[y][x] === 'TREASURE' ||
            game.world[y][x] === 'HEART' ||
            distFromPlayer < 5 // Don't spawn too close to player
        );
        
        if (attempts <= 100) {
            game.enemies.push({
                type,
                x,
                y,
                hp: enemyData.hp,
                maxHp: enemyData.hp,
                lastMove: Date.now(),
                alive: true
            });
        }
    }
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
    
    // Draw enemies
    game.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        const enemyData = ENEMY_TYPES[enemy.type];
        const screenX = enemy.x * TILE_SIZE + offsetX;
        const screenY = enemy.y * TILE_SIZE + offsetY;
        
        // Skip if off-screen
        if (screenX < -TILE_SIZE || screenX > canvasWidth + TILE_SIZE ||
            screenY < -TILE_SIZE || screenY > canvasHeight + TILE_SIZE) {
            return;
        }
        
        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(screenX + TILE_SIZE/2, screenY + TILE_SIZE*0.8, TILE_SIZE*0.3, TILE_SIZE*0.15, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw enemy
        ctx.font = `${TILE_SIZE * 0.7}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            enemyData.emoji,
            screenX + TILE_SIZE / 2,
            screenY + TILE_SIZE / 2
        );
        
        // Draw health bar if damaged
        if (enemy.hp < enemy.maxHp) {
            const barWidth = TILE_SIZE * 0.8;
            const barHeight = 6;
            const barX = screenX + (TILE_SIZE - barWidth) / 2;
            const barY = screenY + TILE_SIZE * 0.15;
            
            ctx.fillStyle = '#000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            ctx.fillStyle = '#F44336';
            ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * (enemy.hp / enemy.maxHp), barHeight - 2);
        }
    });
    
    // Draw player at center with glow
    const playerScreenX = canvasWidth / 2;
    const playerScreenY = canvasHeight / 2;
    
    // Flash when invulnerable
    if (game.player.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 20;
    ctx.font = `bold ${TILE_SIZE * 0.8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.player.emoji, playerScreenX, playerScreenY);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
    
    // Draw sword attack animation
    if (game.combat.attacking) {
        const swordAngle = {
            'up': -Math.PI / 2,
            'down': Math.PI / 2,
            'left': Math.PI,
            'right': 0
        }[game.player.facing];
        
        const swordDist = TILE_SIZE * 0.8;
        const swordX = playerScreenX + Math.cos(swordAngle) * swordDist;
        const swordY = playerScreenY + Math.sin(swordAngle) * swordDist;
        
        ctx.font = `${TILE_SIZE * 0.6}px Arial`;
        ctx.save();
        ctx.translate(swordX, swordY);
        ctx.rotate(swordAngle);
        ctx.fillText('⚔️', 0, 0);
        ctx.restore();
    }
    
    // Draw damage numbers
    game.animations = game.animations.filter(anim => {
        const age = Date.now() - anim.startTime;
        if (age > anim.duration) return false;
        
        const progress = age / anim.duration;
        const screenX = anim.x * TILE_SIZE + offsetX;
        const screenY = anim.y * TILE_SIZE + offsetY - progress * 30;
        
        ctx.globalAlpha = 1 - progress;
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = anim.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(anim.text, screenX + TILE_SIZE/2, screenY);
        ctx.fillText(anim.text, screenX + TILE_SIZE/2, screenY);
        ctx.globalAlpha = 1.0;
        
        return true;
    });
}

// Move player in the world
function movePlayer(dx, dy) {
    const newX = game.player.x + dx;
    const newY = game.player.y + dy;
    
    // Update facing direction
    if (dx > 0) game.player.facing = 'right';
    else if (dx < 0) game.player.facing = 'left';
    else if (dy > 0) game.player.facing = 'down';
    else if (dy < 0) game.player.facing = 'up';
    
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
    
    // Check for enemy collision
    const enemyAtTarget = game.enemies.find(e => e.alive && e.x === newX && e.y === newY);
    if (enemyAtTarget) {
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
        addAnimation(newX, newY, '+💎', '#FFD700', 800);
        
        // Victory check
        if (game.treasures.collected === game.treasures.total) {
            setTimeout(() => {
                alert(`🎉 Victory! You found all ${game.treasures.total} treasures!`);
                resetGame();
            }, 100);
        }
    }
    
    // Check for heart
    if (targetTile === 'HEART') {
        if (game.player.health < game.player.maxHealth) {
            game.world[newY][newX] = 'GRASS';
            game.player.health = Math.min(game.player.maxHealth, game.player.health + 2);
            addAnimation(newX, newY, '+2❤️', '#F44336', 800);
        }
    }
    
    // Update UI
    updateHUD();
    draw();
    return true;
}

// Player attack
function playerAttack() {
    if (game.combat.attackCooldown > Date.now() || game.combat.attacking) {
        return;
    }
    
    game.combat.attacking = true;
    game.combat.attackCooldown = Date.now() + 500;
    
    // Calculate attack position based on facing
    const attackOffsets = {
        'up': { x: 0, y: -1 },
        'down': { x: 0, y: 1 },
        'left': { x: -1, y: 0 },
        'right': { x: 1, y: 0 }
    };
    
    const offset = attackOffsets[game.player.facing];
    const attackX = game.player.x + offset.x;
    const attackY = game.player.y + offset.y;
    
    // Check for enemies in attack range
    game.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        const dist = Math.sqrt((enemy.x - attackX) ** 2 + (enemy.y - attackY) ** 2);
        if (dist < game.combat.attackRange) {
            enemy.hp -= 1;
            addAnimation(enemy.x, enemy.y, '-1', '#FFF', 600);
            
            if (enemy.hp <= 0) {
                enemy.alive = false;
                addAnimation(enemy.x, enemy.y, '💥', '#FF9800', 800);
            }
        }
    });
    
    setTimeout(() => {
        game.combat.attacking = false;
    }, 200);
    
    draw();
}

// Enemy AI and movement
function updateEnemies() {
    const now = Date.now();
    
    game.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        
        const enemyData = ENEMY_TYPES[enemy.type];
        
        // Check if it's time to move
        if (now - enemy.lastMove < enemyData.speed) {
            return;
        }
        
        enemy.lastMove = now;
        
        // Calculate distance to player
        const dx = game.player.x - enemy.x;
        const dy = game.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // If player is close, move towards them
        if (dist < 8) {
            let moveX = 0, moveY = 0;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                moveX = dx > 0 ? 1 : -1;
            } else {
                moveY = dy > 0 ? 1 : -1;
            }
            
            const newX = enemy.x + moveX;
            const newY = enemy.y + moveY;
            
            // Check if new position is valid
            if (newX >= 0 && newX < WORLD_WIDTH && newY >= 0 && newY < WORLD_HEIGHT) {
                const targetTile = game.world[newY][newX];
                const blocked = !TILES[targetTile].walkable || 
                               game.enemies.some(e => e.alive && e !== enemy && e.x === newX && e.y === newY);
                
                if (!blocked) {
                    enemy.x = newX;
                    enemy.y = newY;
                    
                    // Check collision with player
                    if (enemy.x === game.player.x && enemy.y === game.player.y) {
                        damagePlayer(enemyData.damage);
                    }
                }
            }
        } else {
            // Random movement when far from player
            if (Math.random() < 0.3) {
                const dirs = [{x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0}];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                const newX = enemy.x + dir.x;
                const newY = enemy.y + dir.y;
                
                if (newX >= 0 && newX < WORLD_WIDTH && newY >= 0 && newY < WORLD_HEIGHT) {
                    const targetTile = game.world[newY][newX];
                    if (TILES[targetTile].walkable) {
                        enemy.x = newX;
                        enemy.y = newY;
                    }
                }
            }
        }
    });
}

// Damage player
function damagePlayer(damage) {
    if (game.player.invulnerable) return;
    
    game.player.health -= damage;
    game.player.invulnerable = true;
    game.player.invulnerableUntil = Date.now() + 1500;
    
    addAnimation(game.player.x, game.player.y, `-${damage}`, '#F44336', 800);
    
    setTimeout(() => {
        game.player.invulnerable = false;
    }, 1500);
    
    if (game.player.health <= 0) {
        game.player.health = 0;
        setTimeout(() => {
            alert('💀 Game Over! You were defeated...');
            resetGame();
        }, 100);
    }
    
    updateHUD();
}

// Add animation
function addAnimation(x, y, text, color, duration) {
    game.animations.push({
        x, y, text, color, duration,
        startTime: Date.now()
    });
}

// Update HUD display
function updateHUD() {
    document.getElementById('treasures').textContent = 
        `${game.treasures.collected} / ${game.treasures.total}`;
    
    // Draw hearts
    const heartsHTML = [];
    const fullHearts = Math.floor(game.player.health / 2);
    const halfHeart = game.player.health % 2;
    const emptyHearts = Math.floor((game.player.maxHealth - game.player.health) / 2);
    
    for (let i = 0; i < fullHearts; i++) {
        heartsHTML.push('❤️');
    }
    if (halfHeart) {
        heartsHTML.push('💔');
    }
    for (let i = 0; i < emptyHearts; i++) {
        heartsHTML.push('🖤');
    }
    
    document.getElementById('health').innerHTML = heartsHTML.join(' ');
}

// Reset game
function resetGame() {
    game.player.x = 20;
    game.player.y = 20;
    game.player.health = game.player.maxHealth;
    game.player.facing = 'down';
    game.player.invulnerable = false;
    game.treasures.collected = 0;
    game.treasurePositions = [];
    game.enemies = [];
    game.animations = [];
    game.combat.attacking = false;
    game.combat.attackCooldown = 0;
    generateWorld();
    updateCamera();
    updateHUD();
    draw();
}

// Game loop for enemy updates
function gameLoop() {
    if (!game.started) {
        requestAnimationFrame(gameLoop);
        return;
    }
    
    updateEnemies();
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Handle button controls
document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        if (dir) {
            handleDirection(dir);
        } else if (btn.dataset.action === 'attack') {
            playerAttack();
        }
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
    } else if ((e.key === ' ' || e.key === 'Spacebar') && game.started) {
        e.preventDefault();
        playerAttack();
    }
});

// Handle swipe gestures on entire canvas
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    touchStartTime = Date.now();
}, { passive: true });

canvas.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    const touchDuration = Date.now() - touchStartTime;
    
    if (game.started) {
        // Quick tap = attack
        if (touchDuration < 200 && Math.abs(touchEndX - touchStartX) < 10 && Math.abs(touchEndY - touchStartY) < 10) {
            playerAttack();
        } else {
            // Swipe = move
            handleSwipe();
        }
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
gameLoop();

console.log('🗺️ Tile Adventure loaded! Explore the scrolling world!');
console.log(`World size: ${WORLD_WIDTH}x${WORLD_HEIGHT} tiles`);
console.log('🎮 Tap to attack, swipe to move!');
