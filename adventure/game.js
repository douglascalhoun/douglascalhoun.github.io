// Adventure Quest - Turn-based Zelda-style mobile RPG
// Optimized for Safari on iPhone

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const TILE_SIZE = 64;
const WORLD_WIDTH = 40;
const WORLD_HEIGHT = 40;

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;
canvas.width = canvasWidth;
canvas.height = canvasHeight;

let tilesX = Math.ceil(canvasWidth / TILE_SIZE) + 2;
let tilesY = Math.ceil(canvasHeight / TILE_SIZE) + 2;

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

const TILES = {
    GRASS: { color: '#A5D6A7', walkable: true, emoji: '🌱', opacity: 0.3 },
    WATER: { color: '#90CAF9', walkable: false, emoji: '💧', opacity: 0.4 },
    TREE: { color: '#81C784', walkable: false, emoji: '🌲', opacity: 0.5 },
    MOUNTAIN: { color: '#B0BEC5', walkable: false, emoji: '⛰️', opacity: 0.5 },
    SAND: { color: '#FFE082', walkable: true, emoji: '🏖️', opacity: 0.3 },
    STONE: { color: '#BDBDBD', walkable: true, emoji: '🪨', opacity: 0.3 },
    TREASURE: { color: '#FFD700', walkable: true, emoji: '💎', collectible: true, opacity: 1.0 },
    FLOWER: { color: '#C8E6C9', walkable: true, emoji: '🌸', opacity: 0.4 },
    HEART: { color: '#FFCDD2', walkable: true, emoji: '❤️', collectible: true, opacity: 1.0 },
    HOUSE: { color: '#8D6E63', walkable: false, emoji: '🏠', opacity: 0.9 },
    DOOR: { color: '#6D4C41', walkable: true, emoji: '🚪', opacity: 1.0 },
    FLOOR: { color: '#D7CCC8', walkable: true, emoji: '🟫', opacity: 0.25 },
    WALL: { color: '#5D4037', walkable: false, emoji: '🧱', opacity: 0.7 },
    EXIT: { color: '#6D4C41', walkable: true, emoji: '🚪', opacity: 1.0 },
    CHEST: { color: '#FFD54F', walkable: true, emoji: '📦', opacity: 1.0 }
};

const ENEMY_TYPES = {
    SLIME: { emoji: '🟢', hp: 2, damage: 1, name: 'Slime' },
    BAT: { emoji: '🦇', hp: 1, damage: 1, name: 'Bat' },
    SKELETON: { emoji: '💀', hp: 3, damage: 2, name: 'Skeleton' },
    SPIDER: { emoji: '🕷️', hp: 2, damage: 1, name: 'Spider' }
};

const ITEM_TYPES = {
    SWORD: { emoji: '⚔️', name: 'Iron Sword', damage: 1, description: 'Boosts attack damage', equipped: false },
    SHIELD: { emoji: '🛡️', name: 'Wooden Shield', defense: 1, description: 'Reduces enemy damage', equipped: false },
    POTION: { emoji: '🧪', name: 'Health Potion', healing: 4, consumable: true, description: 'Restores 2 hearts' },
    KEY: { emoji: '🔑', name: 'Golden Key', special: true, description: 'Opens locked doors' },
    BOMB: { emoji: '💣', name: 'Bomb', damage: 3, aoe: true, consumable: true, description: 'Damages nearby foes' }
};

const game = {
    player: {
        x: 20,
        y: 20,
        emoji: '🧙',
        maxHealth: 6,
        health: 6,
        facing: 'down',
        coins: 0,
        overworldX: 20,
        overworldY: 20
    },
    camera: { x: 20, y: 20 },
    combat: {
        inCombat: false,
        currentEnemy: null,
        playerTurn: true,
        attackDamage: 1,
        defense: 0,
        combatLog: [],
        buttons: []
    },
    inventory: { items: [], maxSize: 20, selectedSlot: 0 },
    treasures: { collected: 0, total: 8 },
    enemies: [],
    items: [],
    npcs: [],
    world: [],
    overworld: null,
    location: 'overworld',
    buildings: {},
    dialogue: { active: false, lines: [], index: 0, speaker: '', onComplete: null },
    quests: {
        active: null,
        completed: [],
        killCount: 0,
        list: {
            welcome: {
                id: 'welcome',
                title: 'Talk to the Elder',
                desc: 'Find the village elder near the houses',
                target: 1
            },
            slay: {
                id: 'slay',
                title: 'Clear the Path',
                desc: 'Defeat 5 monsters',
                target: 5
            },
            gems: {
                id: 'gems',
                title: 'Treasure Hunt',
                desc: 'Collect 5 gems',
                target: 5
            },
            dungeon: {
                id: 'dungeon',
                title: 'Dungeon Key',
                desc: 'Find a key and enter the dungeon',
                target: 1
            }
        }
    },
    started: false,
    animations: [],
    showInventory: false,
    message: null,
    messageUntil: 0
};

function isWalkable(x, y, map = game.world) {
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return false;
    const tile = TILES[map[y][x]];
    return tile && tile.walkable;
}

function generateWorld() {
    const map = [];
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        map[y] = [];
        for (let x = 0; x < WORLD_WIDTH; x++) {
            map[y][x] = 'GRASS';
        }
    }

    for (let x = 0; x < WORLD_WIDTH; x++) {
        map[10][x] = 'WATER';
        map[11][x] = 'WATER';
    }
    for (let y = 0; y < WORLD_HEIGHT; y++) {
        if (y < 10 || y > 11) map[y][15] = 'WATER';
    }

    [[20, 10], [20, 11], [5, 10], [5, 11], [30, 10], [30, 11]].forEach(([x, y]) => {
        map[y][x] = 'STONE';
    });
    for (let x = 14; x <= 16; x++) {
        map[5][x] = 'STONE';
        map[25][x] = 'STONE';
    }

    const forests = [
        { cx: 5, cy: 5, r: 3 },
        { cx: 35, cy: 5, r: 4 },
        { cx: 5, cy: 35, r: 3 },
        { cx: 35, cy: 35, r: 4 },
        { cx: 20, cy: 30, r: 2 }
    ];
    forests.forEach(f => {
        for (let dy = -f.r; dy <= f.r; dy++) {
            for (let dx = -f.r; dx <= f.r; dx++) {
                if (Math.sqrt(dx * dx + dy * dy) <= f.r && Math.random() > 0.3) {
                    const fx = f.cx + dx;
                    const fy = f.cy + dy;
                    if (fx >= 0 && fx < WORLD_WIDTH && fy >= 0 && fy < WORLD_HEIGHT && map[fy][fx] === 'GRASS') {
                        map[fy][fx] = 'TREE';
                    }
                }
            }
        }
    });

    [[10, 25], [11, 25], [12, 25], [10, 26], [11, 26], [12, 26],
     [28, 15], [29, 15], [30, 15], [28, 16], [29, 16], [30, 16]].forEach(([x, y]) => {
        if (map[y][x] === 'GRASS') map[y][x] = 'MOUNTAIN';
    });

    for (let y = 0; y < WORLD_HEIGHT; y++) {
        for (let x = 0; x < WORLD_WIDTH; x++) {
            if (map[y][x] !== 'GRASS') continue;
            const nearWater =
                (x > 0 && map[y][x - 1] === 'WATER') ||
                (x < WORLD_WIDTH - 1 && map[y][x + 1] === 'WATER') ||
                (y > 0 && map[y - 1][x] === 'WATER') ||
                (y < WORLD_HEIGHT - 1 && map[y + 1][x] === 'WATER');
            if (nearWater && Math.random() > 0.5) map[y][x] = 'SAND';
        }
    }

    for (let i = 0; i < 40; i++) {
        const x = Math.floor(Math.random() * WORLD_WIDTH);
        const y = Math.floor(Math.random() * WORLD_HEIGHT);
        if (map[y][x] === 'GRASS') map[y][x] = 'FLOWER';
    }

    // Village near start
    placeBuilding(map, 18, 17, 'elder_house');
    placeBuilding(map, 22, 17, 'shop');
    placeBuilding(map, 33, 28, 'dungeon');

    [[10, 8], [30, 8], [10, 30], [30, 30], [20, 14], [25, 22]].forEach(([x, y]) => {
        if (TILES[map[y][x]].walkable && map[y][x] !== 'DOOR') map[y][x] = 'HEART';
    });

    const treasureSpots = [
        [2, 2], [37, 2], [2, 37], [37, 37],
        [20, 2], [20, 37], [2, 20], [37, 20]
    ];
    game.treasurePositions = [];
    treasureSpots.forEach(([x, y]) => {
        if (TILES[map[y][x]].walkable && map[y][x] !== 'DOOR') {
            map[y][x] = 'TREASURE';
            game.treasurePositions.push({ x, y });
        }
    });
    game.treasures.total = game.treasurePositions.length;

    game.overworld = map;
    game.world = map;
    game.location = 'overworld';

    buildInteriors();
    spawnEnemies();
    spawnItems();
    spawnNPCs();

    game.quests.active = 'welcome';
    game.quests.killCount = 0;
    game.quests.completed = [];
}

function placeBuilding(map, doorX, doorY, id) {
    // Roof / house tiles around door
    for (let dy = -2; dy <= -1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = doorX + dx;
            const y = doorY + dy;
            if (x >= 0 && x < WORLD_WIDTH && y >= 0 && y < WORLD_HEIGHT) {
                map[y][x] = 'HOUSE';
            }
        }
    }
    map[doorY][doorX] = 'DOOR';
    game.buildings[`${doorX},${doorY}`] = id;
}

function makeInterior(w, h, fill = 'FLOOR') {
    const map = [];
    for (let y = 0; y < h; y++) {
        map[y] = [];
        for (let x = 0; x < w; x++) {
            map[y][x] = (x === 0 || y === 0 || x === w - 1 || y === h - 1) ? 'WALL' : fill;
        }
    }
    return map;
}

function buildInteriors() {
    // Elder house
    const elder = makeInterior(9, 8);
    elder[7][4] = 'EXIT';
    elder[2][4] = 'CHEST';
    game.buildings.elder_house = {
        map: elder,
        spawn: { x: 4, y: 6 },
        exit: { x: 4, y: 7 },
        returnPos: { x: 18, y: 18 },
        npcs: [{
            id: 'elder',
            x: 4,
            y: 3,
            emoji: '👴',
            name: 'Elder',
            talk: talkToElder
        }]
    };

    // Shop
    const shop = makeInterior(9, 8);
    shop[7][4] = 'EXIT';
    game.buildings.shop = {
        map: shop,
        spawn: { x: 4, y: 6 },
        exit: { x: 4, y: 7 },
        returnPos: { x: 22, y: 18 },
        npcs: [{
            id: 'merchant',
            x: 4,
            y: 2,
            emoji: '🧑‍🌾',
            name: 'Merchant',
            talk: talkToMerchant
        }]
    };

    // Dungeon
    const dungeon = makeInterior(11, 11);
    dungeon[10][5] = 'EXIT';
    dungeon[2][2] = 'TREASURE';
    dungeon[2][8] = 'TREASURE';
    dungeon[5][5] = 'CHEST';
    dungeon[1][5] = 'HEART';
    game.buildings.dungeon = {
        map: dungeon,
        spawn: { x: 5, y: 9 },
        exit: { x: 5, y: 10 },
        returnPos: { x: 33, y: 29 },
        locked: true,
        npcs: [],
        enemies: [
            { type: 'SKELETON', x: 3, y: 4 },
            { type: 'SPIDER', x: 7, y: 4 },
            { type: 'BAT', x: 5, y: 3 },
            { type: 'SKELETON', x: 2, y: 7 },
            { type: 'SPIDER', x: 8, y: 7 }
        ],
        items: [
            { type: 'POTION', x: 8, y: 2 },
            { type: 'BOMB', x: 2, y: 2 }
        ]
    };
}

function spawnEnemies() {
    game.enemies = [];
    if (game.location !== 'overworld') {
        const building = game.buildings[game.location];
        if (building && building.enemies) {
            building.enemies.forEach(e => {
                const data = ENEMY_TYPES[e.type];
                game.enemies.push({
                    type: e.type,
                    x: e.x,
                    y: e.y,
                    hp: data.hp,
                    maxHp: data.hp,
                    alive: true
                });
            });
        }
        return;
    }

    const types = Object.keys(ENEMY_TYPES);
    for (let i = 0; i < 12; i++) {
        let x, y, attempts = 0, dist = 0;
        do {
            x = Math.floor(Math.random() * WORLD_WIDTH);
            y = Math.floor(Math.random() * WORLD_HEIGHT);
            dist = Math.hypot(x - 20, y - 20);
            attempts++;
        } while (
            attempts < 80 &&
            (!isWalkable(x, y) ||
                ['TREASURE', 'HEART', 'DOOR'].includes(game.world[y][x]) ||
                dist < 4 ||
                game.enemies.some(e => e.x === x && e.y === y))
        );
        if (attempts < 80) {
            const type = types[i % types.length];
            const data = ENEMY_TYPES[type];
            game.enemies.push({ type, x, y, hp: data.hp, maxHp: data.hp, alive: true });
        }
    }
}

function spawnItems() {
    game.items = [];
    if (game.location !== 'overworld') {
        const building = game.buildings[game.location];
        if (building && building.items) {
            building.items.forEach(item => {
                game.items.push({ ...item, collected: false });
            });
        }
        return;
    }

    [
        { type: 'SWORD', x: 8, y: 8 },
        { type: 'SHIELD', x: 32, y: 8 },
        { type: 'POTION', x: 20, y: 12 },
        { type: 'POTION', x: 12, y: 28 },
        { type: 'KEY', x: 25, y: 25 },
        { type: 'BOMB', x: 28, y: 12 },
        { type: 'BOMB', x: 6, y: 22 }
    ].forEach(item => {
        if (isWalkable(item.x, item.y) && !['DOOR', 'TREASURE'].includes(game.world[item.y][item.x])) {
            game.items.push({ ...item, collected: false });
        }
    });
}

function spawnNPCs() {
    game.npcs = [];
    if (game.location === 'overworld') {
        game.npcs = [
            {
                id: 'guide',
                x: 20,
                y: 19,
                emoji: '🧒',
                name: 'Guide',
                talk: () => startDialogue('Guide', [
                    'Welcome, adventurer!',
                    'Swipe to move. Walk into monsters to fight.',
                    'Visit the houses north of here!',
                    'Talk to the Elder for your first quest.'
                ])
            }
        ];
        return;
    }
    const building = game.buildings[game.location];
    if (building && building.npcs) {
        game.npcs = building.npcs.map(n => ({ ...n }));
    }
}

function talkToElder() {
    if (!game.quests.completed.includes('welcome')) {
        startDialogue('Elder', [
            'Ah, a brave soul!',
            'Monsters threaten our village.',
            'Defeat 5 of them and return to me.',
            'Take this potion for the road.'
        ], () => {
            completeQuest('welcome');
            giveItem('POTION');
            startQuest('slay');
            showToast('Quest: Clear the Path');
        });
        return;
    }

    if (game.quests.active === 'slay') {
        if (game.quests.killCount >= 5) {
            startDialogue('Elder', [
                'You did it! The path is safer.',
                'Now gather 5 gems across the land.',
                'Here are some coins for your help.'
            ], () => {
                completeQuest('slay');
                game.player.coins += 20;
                startQuest('gems');
                showToast('Quest: Treasure Hunt');
                updateHUD();
            });
        } else {
            startDialogue('Elder', [
                `You have defeated ${game.quests.killCount}/5 monsters.`,
                'Keep going, hero!'
            ]);
        }
        return;
    }

    if (game.quests.active === 'gems') {
        if (game.treasures.collected >= 5) {
            startDialogue('Elder', [
                'Wonderful! Those gems will help us.',
                'Find a golden key, then enter the dungeon to the southeast.',
                'Good luck!'
            ], () => {
                completeQuest('gems');
                startQuest('dungeon');
                showToast('Quest: Dungeon Key');
            });
        } else {
            startDialogue('Elder', [
                `Gems collected: ${game.treasures.collected}/5.`,
                'Search the corners of the world!'
            ]);
        }
        return;
    }

    if (game.quests.active === 'dungeon') {
        startDialogue('Elder', [
            'The dungeon door is southeast of the village.',
            'You will need a golden key to enter.'
        ]);
        return;
    }

    startDialogue('Elder', [
        'You have done much for us.',
        'Explore freely, and stay safe!'
    ]);
}

function talkToMerchant() {
    startDialogue('Merchant', [
        'Potions for sale! 10 coins each.',
        'Tap YES to buy one potion.'
    ], () => {
        if (game.player.coins >= 10) {
            game.player.coins -= 10;
            giveItem('POTION');
            showToast('Bought a potion!');
            updateHUD();
        } else {
            showToast('Not enough coins!');
        }
    });
}

function giveItem(type) {
    const data = ITEM_TYPES[type];
    if (data.consumable) {
        const existing = game.inventory.items.find(i => i.type === type);
        if (existing) existing.quantity += 1;
        else game.inventory.items.push({ type, quantity: 1 });
    } else if (game.inventory.items.length < game.inventory.maxSize) {
        game.inventory.items.push({ type, quantity: 1 });
    }
    addAnimation(game.player.x, game.player.y, `+${data.emoji}`, '#FFD700', 900);
}

function hasItem(type) {
    return game.inventory.items.some(i => i.type === type);
}

function startQuest(id) {
    game.quests.active = id;
    updateHUD();
}

function completeQuest(id) {
    if (!game.quests.completed.includes(id)) {
        game.quests.completed.push(id);
    }
    if (game.quests.active === id) game.quests.active = null;
    updateHUD();
}

function startDialogue(speaker, lines, onComplete = null) {
    game.dialogue = {
        active: true,
        speaker,
        lines,
        index: 0,
        onComplete
    };
    draw();
}

function advanceDialogue() {
    if (!game.dialogue.active) return;
    game.dialogue.index += 1;
    if (game.dialogue.index >= game.dialogue.lines.length) {
        const cb = game.dialogue.onComplete;
        game.dialogue.active = false;
        game.dialogue.lines = [];
        game.dialogue.index = 0;
        game.dialogue.onComplete = null;
        if (cb) cb();
    }
    draw();
}

function showToast(text) {
    game.message = text;
    game.messageUntil = Date.now() + 2200;
}

function enterBuilding(id) {
    const building = game.buildings[id];
    if (!building) return;

    if (building.locked && !hasItem('KEY')) {
        showToast('Locked! Need a key 🔑');
        return;
    }

    if (building.locked && hasItem('KEY') && game.quests.active === 'dungeon') {
        completeQuest('dungeon');
        showToast('Dungeon unlocked!');
    }

    game.player.overworldX = game.player.x;
    game.player.overworldY = game.player.y;
    game.location = id;
    game.world = building.map;
    game.player.x = building.spawn.x;
    game.player.y = building.spawn.y;
    spawnEnemies();
    spawnItems();
    spawnNPCs();
    updateCamera();
    showToast(id === 'dungeon' ? 'Entered the dungeon!' : 'Entered building');
    updateHUD();
    draw();
}

function exitBuilding() {
    const building = game.buildings[game.location];
    const returnPos = building ? building.returnPos : { x: game.player.overworldX, y: game.player.overworldY };
    game.location = 'overworld';
    game.world = game.overworld;
    game.player.x = returnPos.x;
    game.player.y = returnPos.y;
    spawnEnemies();
    spawnItems();
    spawnNPCs();
    updateCamera();
    showToast('Back outside');
    updateHUD();
    draw();
}

function updateCamera() {
    game.camera.x = game.player.x;
    game.camera.y = game.player.y;
}

function mapHeight() {
    return game.world.length;
}

function mapWidth() {
    return game.world[0] ? game.world[0].length : 0;
}

function draw() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const offsetX = canvasWidth / 2 - (game.camera.x * TILE_SIZE + TILE_SIZE / 2);
    const offsetY = canvasHeight / 2 - (game.camera.y * TILE_SIZE + TILE_SIZE / 2);

    const startX = Math.max(0, Math.floor(game.camera.x - tilesX / 2));
    const endX = Math.min(mapWidth(), Math.ceil(game.camera.x + tilesX / 2));
    const startY = Math.max(0, Math.floor(game.camera.y - tilesY / 2));
    const endY = Math.min(mapHeight(), Math.ceil(game.camera.y + tilesY / 2));

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const tileType = TILES[game.world[y][x]] || TILES.GRASS;
            const screenX = x * TILE_SIZE + offsetX;
            const screenY = y * TILE_SIZE + offsetY;

            ctx.fillStyle = tileType.color;
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

            if (tileType.emoji) {
                ctx.globalAlpha = tileType.opacity || 0.3;
                ctx.font = `${TILE_SIZE * (tileType.opacity >= 0.9 ? 0.55 : 0.35)}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(tileType.emoji, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
                ctx.globalAlpha = 1;
            }
        }
    }

    // Items
    game.items.forEach(item => {
        if (item.collected) return;
        const data = ITEM_TYPES[item.type];
        const screenX = item.x * TILE_SIZE + offsetX;
        const screenY = item.y * TILE_SIZE + offsetY;
        if (screenX < -TILE_SIZE || screenX > canvasWidth + TILE_SIZE) return;
        const pulse = Math.sin(Date.now() / 300) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 18;
        ctx.font = `${TILE_SIZE * 0.75}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.emoji, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
    });

    // NPCs
    game.npcs.forEach(npc => {
        const screenX = npc.x * TILE_SIZE + offsetX;
        const screenY = npc.y * TILE_SIZE + offsetY;
        ctx.font = `${TILE_SIZE * 0.8}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(npc.emoji, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);
    });

    // Enemies
    game.enemies.forEach(enemy => {
        if (!enemy.alive) return;
        const data = ENEMY_TYPES[enemy.type];
        const screenX = enemy.x * TILE_SIZE + offsetX;
        const screenY = enemy.y * TILE_SIZE + offsetY;
        if (screenX < -TILE_SIZE || screenX > canvasWidth + TILE_SIZE) return;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(screenX + TILE_SIZE / 2, screenY + TILE_SIZE * 0.85, TILE_SIZE * 0.3, TILE_SIZE * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = `${TILE_SIZE * 0.85}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.emoji, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2);

        if (enemy.hp < enemy.maxHp) {
            const barW = TILE_SIZE * 0.8;
            const barX = screenX + (TILE_SIZE - barW) / 2;
            const barY = screenY + 6;
            ctx.fillStyle = '#000';
            ctx.fillRect(barX, barY, barW, 6);
            ctx.fillStyle = '#F44336';
            ctx.fillRect(barX + 1, barY + 1, (barW - 2) * (enemy.hp / enemy.maxHp), 4);
        }
    });

    // Player
    const px = canvasWidth / 2;
    const py = canvasHeight / 2;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(px, py + TILE_SIZE * 0.35, TILE_SIZE * 0.35, TILE_SIZE * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 22;
    ctx.font = `bold ${TILE_SIZE * 0.9}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.player.emoji, px, py);
    ctx.shadowBlur = 0;

    // Floating text
    game.animations = game.animations.filter(anim => {
        const age = Date.now() - anim.startTime;
        if (age > anim.duration) return false;
        const progress = age / anim.duration;
        const screenX = anim.x * TILE_SIZE + offsetX;
        const screenY = anim.y * TILE_SIZE + offsetY - progress * 30;
        ctx.globalAlpha = 1 - progress;
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = anim.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(anim.text, screenX + TILE_SIZE / 2, screenY);
        ctx.fillText(anim.text, screenX + TILE_SIZE / 2, screenY);
        ctx.globalAlpha = 1;
        return true;
    });

    if (game.message && Date.now() < game.messageUntil) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(canvasWidth / 2 - 140, 90, 280, 40);
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(game.message, canvasWidth / 2, 115);
    }

    if (game.combat.inCombat) drawCombatUI();
    if (game.showInventory) drawInventory();
    if (game.dialogue.active) drawDialogue();
}

function drawDialogue() {
    const boxW = Math.min(520, canvasWidth - 30);
    const boxH = 150;
    const boxX = (canvasWidth - boxW) / 2;
    const boxY = canvasHeight - boxH - 30;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(game.dialogue.speaker, boxX + 20, boxY + 30);

    ctx.fillStyle = '#FFF';
    ctx.font = '18px Arial';
    wrapText(game.dialogue.lines[game.dialogue.index], boxX + 20, boxY + 60, boxW - 40, 24);

    ctx.fillStyle = '#AAA';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('Tap to continue ▶', boxX + boxW - 20, boxY + boxH - 18);
}

function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let yy = y;
    ctx.textAlign = 'left';
    for (let n = 0; n < words.length; n++) {
        const test = line + words[n] + ' ';
        if (ctx.measureText(test).width > maxWidth && n > 0) {
            ctx.fillText(line, x, yy);
            line = words[n] + ' ';
            yy += lineHeight;
        } else {
            line = test;
        }
    }
    ctx.fillText(line, x, yy);
}

function drawCombatUI() {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const enemy = game.combat.currentEnemy;
    if (!enemy) return;
    const enemyData = ENEMY_TYPES[enemy.type];

    const boxW = Math.min(500, canvasWidth - 40);
    const boxH = Math.min(360, canvasHeight - 180);
    const boxX = (canvasWidth - boxW) / 2;
    const boxY = canvasHeight - boxH - 20;

    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 26px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${enemyData.emoji} ${enemyData.name}`, canvasWidth / 2, boxY + 36);

    const barW = boxW - 80;
    const barX = boxX + 40;
    const barY = boxY + 55;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, 18);
    ctx.fillStyle = '#F44336';
    ctx.fillRect(barX, barY, barW * Math.max(0, enemy.hp / enemy.maxHp), 18);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(barX, barY, barW, 18);
    ctx.fillStyle = '#FFF';
    ctx.font = '13px Arial';
    ctx.fillText(`HP ${Math.max(0, enemy.hp)}/${enemy.maxHp}`, canvasWidth / 2, barY + 14);

    ctx.font = '15px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#DDD';
    let logY = boxY + 100;
    game.combat.combatLog.forEach(msg => {
        ctx.fillText(msg, boxX + 24, logY);
        logY += 22;
    });

    game.combat.buttons = [];
    if (game.combat.playerTurn) {
        const btnW = (boxW - 50) / 3;
        const btnH = 56;
        const btnY = boxY + boxH - btnH - 18;
        const labels = [
            { label: '⚔️ Attack', action: 'attack' },
            { label: '🧪 Item', action: 'item' },
            { label: '🏃 Run', action: 'run' }
        ];
        labels.forEach((btn, i) => {
            const x = boxX + 18 + i * (btnW + 8);
            ctx.fillStyle = '#e94560';
            ctx.fillRect(x, btnY, btnW, btnH);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, btnY, btnW, btnH);
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, x + btnW / 2, btnY + 34);
            game.combat.buttons.push({ x, y: btnY, width: btnW, height: btnH, action: btn.action });
        });
    } else {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Enemy's Turn...", canvasWidth / 2, boxY + boxH - 40);
    }
}

function drawInventory() {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    const invW = Math.min(560, canvasWidth - 40);
    const invH = Math.min(460, canvasHeight - 100);
    const invX = (canvasWidth - invW) / 2;
    const invY = (canvasHeight - invH) / 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 4;
    ctx.fillRect(invX, invY, invW, invH);
    ctx.strokeRect(invX, invY, invW, invH);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎒 INVENTORY', canvasWidth / 2, invY + 38);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`💰 ${game.player.coins}`, canvasWidth / 2, invY + 68);

    const cols = 5;
    const rows = 3;
    const cell = Math.min(78, (invW - 60) / cols);
    const gridX = invX + (invW - cols * cell) / 2;
    const gridY = invY + 95;

    for (let i = 0; i < cols * rows; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = gridX + col * cell;
        const y = gridY + row * cell;
        ctx.fillStyle = i === game.inventory.selectedSlot ? '#FFD700' : '#2d2d44';
        ctx.fillRect(x, y, cell - 4, cell - 4);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x, y, cell - 4, cell - 4);

        const item = game.inventory.items[i];
        if (item) {
            const data = ITEM_TYPES[item.type];
            ctx.font = `${cell * 0.5}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(data.emoji, x + (cell - 4) / 2, y + (cell - 4) / 2);
            if (item.quantity > 1) {
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#FFF';
                ctx.fillText(String(item.quantity), x + cell - 18, y + cell - 16);
            }
        }
    }

    const selected = game.inventory.items[game.inventory.selectedSlot];
    if (selected) {
        const data = ITEM_TYPES[selected.type];
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(data.name, canvasWidth / 2, gridY + rows * cell + 28);
        ctx.fillStyle = '#FFF';
        ctx.font = '15px Arial';
        ctx.fillText(data.description, canvasWidth / 2, gridY + rows * cell + 52);
    }

    ctx.fillStyle = '#AAA';
    ctx.font = '14px Arial';
    ctx.fillText('Tap item to use/equip • Tap outside to close', canvasWidth / 2, invY + invH - 18);
}

function movePlayer(dx, dy) {
    if (game.combat.inCombat || game.showInventory || game.dialogue.active) return false;

    const newX = game.player.x + dx;
    const newY = game.player.y + dy;
    if (dx > 0) game.player.facing = 'right';
    else if (dx < 0) game.player.facing = 'left';
    else if (dy > 0) game.player.facing = 'down';
    else if (dy < 0) game.player.facing = 'up';

    if (!isWalkable(newX, newY)) return false;

    const npc = game.npcs.find(n => n.x === newX && n.y === newY);
    if (npc) {
        npc.talk();
        return false;
    }

    const enemy = game.enemies.find(e => e.alive && e.x === newX && e.y === newY);
    if (enemy) {
        startCombat(enemy);
        return false;
    }

    game.player.x = newX;
    game.player.y = newY;
    updateCamera();

    const tile = game.world[newY][newX];

    if (tile === 'DOOR' && game.location === 'overworld') {
        const id = game.buildings[`${newX},${newY}`];
        if (id) enterBuilding(id);
        return true;
    }

    if (tile === 'EXIT' && game.location !== 'overworld') {
        exitBuilding();
        return true;
    }

    if (tile === 'TREASURE') {
        game.world[newY][newX] = game.location === 'overworld' ? 'GRASS' : 'FLOOR';
        game.treasures.collected += 1;
        addAnimation(newX, newY, '+💎', '#FFD700', 800);
        if (game.quests.active === 'gems' && game.treasures.collected >= 5) {
            showToast('Quest ready! Return to Elder');
        }
        if (game.treasures.collected >= game.treasures.total) {
            showToast('All gems found!');
        }
    }

    if (tile === 'HEART' && game.player.health < game.player.maxHealth) {
        game.world[newY][newX] = game.location === 'overworld' ? 'GRASS' : 'FLOOR';
        game.player.health = Math.min(game.player.maxHealth, game.player.health + 2);
        addAnimation(newX, newY, '+2❤️', '#F44336', 800);
    }

    if (tile === 'CHEST') {
        game.world[newY][newX] = 'FLOOR';
        game.player.coins += 15;
        giveItem('POTION');
        showToast('+15 coins & potion!');
    }

    const worldItem = game.items.find(i => !i.collected && i.x === newX && i.y === newY);
    if (worldItem) pickupItem(worldItem);

    updateHUD();
    draw();
    return true;
}

function pickupItem(worldItem) {
    const data = ITEM_TYPES[worldItem.type];
    if (data.consumable) {
        const existing = game.inventory.items.find(i => i.type === worldItem.type);
        if (existing) existing.quantity += 1;
        else game.inventory.items.push({ type: worldItem.type, quantity: 1 });
    } else if (game.inventory.items.length < game.inventory.maxSize) {
        game.inventory.items.push({ type: worldItem.type, quantity: 1 });
    } else {
        showToast('Inventory full!');
        return;
    }
    worldItem.collected = true;
    addAnimation(worldItem.x, worldItem.y, `+${data.emoji}`, '#FFD700', 900);
    if (worldItem.type === 'KEY') showToast('Got a golden key!');
}

function useItem(slot) {
    const item = game.inventory.items[slot];
    if (!item) return;
    const data = ITEM_TYPES[item.type];

    if (game.combat.inCombat) {
        if (data.healing) {
            if (game.player.health >= game.player.maxHealth) {
                showToast('Already full health');
                return;
            }
            game.player.health = Math.min(game.player.maxHealth, game.player.health + data.healing);
            consumeSlot(slot);
            game.showInventory = false;
            addCombatLog('You used a potion!');
            game.combat.playerTurn = false;
            updateHUD();
            draw();
            setTimeout(enemyTurn, 700);
            return;
        }
        if (data.aoe && game.combat.currentEnemy) {
            const enemy = game.combat.currentEnemy;
            enemy.hp -= data.damage;
            consumeSlot(slot);
            game.showInventory = false;
            addCombatLog(`Bomb hits for ${data.damage}!`);
            addAnimation(enemy.x, enemy.y, `-${data.damage}`, '#FF9800', 700);
            if (enemy.hp <= 0) {
                finishEnemy(enemy);
            } else {
                game.combat.playerTurn = false;
                setTimeout(enemyTurn, 700);
            }
            updateHUD();
            draw();
            return;
        }
        showToast('Use a potion or bomb in combat');
        return;
    }

    if (data.consumable && data.healing) {
        if (game.player.health >= game.player.maxHealth) {
            showToast('Already full health');
            return;
        }
        game.player.health = Math.min(game.player.maxHealth, game.player.health + data.healing);
        consumeSlot(slot);
        addAnimation(game.player.x, game.player.y, '+❤️', '#F44336', 800);
        updateHUD();
    } else if (data.consumable && data.aoe) {
        let hit = 0;
        game.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            if (Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y) < 3) {
                enemy.hp -= data.damage;
                hit += 1;
                addAnimation(enemy.x, enemy.y, `-${data.damage}`, '#FF9800', 600);
                if (enemy.hp <= 0) {
                    enemy.alive = false;
                    game.player.coins += 5;
                    game.quests.killCount += 1;
                }
            }
        });
        if (hit === 0) {
            showToast('No enemies nearby');
            return;
        }
        consumeSlot(slot);
        updateHUD();
    } else if (!data.consumable && !data.special) {
        data.equipped = !data.equipped;
        updatePlayerStats();
        showToast(data.equipped ? `Equipped ${data.name}` : `Unequipped ${data.name}`);
    } else {
        showToast(data.description);
    }
    draw();
}

function consumeSlot(slot) {
    const item = game.inventory.items[slot];
    item.quantity -= 1;
    if (item.quantity <= 0) game.inventory.items.splice(slot, 1);
}

function updatePlayerStats() {
    game.combat.attackDamage = 1;
    game.combat.defense = 0;
    game.inventory.items.forEach(item => {
        const data = ITEM_TYPES[item.type];
        if (data.equipped) {
            if (data.damage) game.combat.attackDamage += data.damage;
            if (data.defense) game.combat.defense += data.defense;
        }
    });
}

function startCombat(enemy) {
    game.combat.inCombat = true;
    game.combat.currentEnemy = enemy;
    game.combat.playerTurn = true;
    game.combat.combatLog = [];
    addCombatLog(`⚔️ A ${ENEMY_TYPES[enemy.type].name} appears!`);
    draw();
}

function combatAttack() {
    if (!game.combat.playerTurn || !game.combat.currentEnemy) return;
    const enemy = game.combat.currentEnemy;
    const damage = game.combat.attackDamage;
    enemy.hp -= damage;
    addCombatLog(`You hit for ${damage}!`);
    addAnimation(enemy.x, enemy.y, `-${damage}`, '#FFF', 600);

    if (enemy.hp <= 0) {
        finishEnemy(enemy);
    } else {
        game.combat.playerTurn = false;
        setTimeout(enemyTurn, 700);
    }
    updateHUD();
    draw();
}

function finishEnemy(enemy) {
    enemy.alive = false;
    const coins = Math.floor(Math.random() * 5) + 3;
    game.player.coins += coins;
    game.quests.killCount += 1;
    addCombatLog(`Defeated! +${coins} coins`);
    addAnimation(enemy.x, enemy.y, '💥', '#FF9800', 900);
    if (game.quests.active === 'slay' && game.quests.killCount >= 5) {
        showToast('Quest ready! Return to Elder');
    }
    setTimeout(endCombat, 900);
}

function combatUseItem() {
    if (!game.combat.playerTurn) return;
    game.showInventory = true;
    draw();
}

function combatRun() {
    if (!game.combat.playerTurn) return;
    if (Math.random() < 0.7) {
        addCombatLog('You escaped!');
        setTimeout(endCombat, 700);
    } else {
        addCombatLog("Couldn't escape!");
        game.combat.playerTurn = false;
        setTimeout(enemyTurn, 700);
    }
    draw();
}

function enemyTurn() {
    if (!game.combat.inCombat || !game.combat.currentEnemy) return;
    const enemy = game.combat.currentEnemy;
    const data = ENEMY_TYPES[enemy.type];
    let damage = Math.max(1, data.damage - game.combat.defense);
    game.player.health -= damage;
    addCombatLog(`${data.name} hits for ${damage}!`);
    addAnimation(game.player.x, game.player.y, `-${damage}`, '#F44336', 700);

    if (game.player.health <= 0) {
        game.player.health = 0;
        addCombatLog('You were defeated...');
        updateHUD();
        draw();
        setTimeout(() => {
            alert('💀 Game Over! Returning to village...');
            resetGame();
        }, 900);
        return;
    }

    game.combat.playerTurn = true;
    updateHUD();
    draw();
}

function endCombat() {
    game.combat.inCombat = false;
    game.combat.currentEnemy = null;
    game.combat.combatLog = [];
    game.combat.buttons = [];
    game.showInventory = false;
    draw();
}

function addCombatLog(message) {
    game.combat.combatLog.push(message);
    if (game.combat.combatLog.length > 4) game.combat.combatLog.shift();
}

function addAnimation(x, y, text, color, duration) {
    game.animations.push({ x, y, text, color, duration, startTime: Date.now() });
}

function updateHUD() {
    const hearts = [];
    const full = Math.floor(game.player.health / 2);
    const half = game.player.health % 2;
    const empty = Math.floor((game.player.maxHealth - game.player.health) / 2);
    for (let i = 0; i < full; i++) hearts.push('❤️');
    if (half) hearts.push('💔');
    for (let i = 0; i < empty; i++) hearts.push('🖤');
    document.getElementById('health').innerHTML = hearts.join(' ') || '🖤';
    document.getElementById('treasures').textContent = `${game.treasures.collected} / ${game.treasures.total}`;
    document.getElementById('coins').textContent = game.player.coins;

    const questEl = document.getElementById('quest');
    if (questEl) {
        const q = game.quests.list[game.quests.active];
        if (q) {
            let progress = '';
            if (q.id === 'slay') progress = ` (${Math.min(game.quests.killCount, 5)}/5)`;
            if (q.id === 'gems') progress = ` (${Math.min(game.treasures.collected, 5)}/5)`;
            questEl.textContent = q.title + progress;
        } else {
            questEl.textContent = 'Explore freely';
        }
    }
}

function resetGame() {
    game.player.x = 20;
    game.player.y = 20;
    game.player.health = game.player.maxHealth;
    game.player.facing = 'down';
    game.player.coins = 0;
    game.treasures.collected = 0;
    game.treasurePositions = [];
    game.enemies = [];
    game.items = [];
    game.npcs = [];
    game.inventory.items = [];
    game.inventory.selectedSlot = 0;
    game.animations = [];
    game.combat = {
        inCombat: false,
        currentEnemy: null,
        playerTurn: true,
        attackDamage: 1,
        defense: 0,
        combatLog: [],
        buttons: []
    };
    game.showInventory = false;
    game.dialogue.active = false;
    game.buildings = {};
    Object.keys(ITEM_TYPES).forEach(k => {
        if ('equipped' in ITEM_TYPES[k]) ITEM_TYPES[k].equipped = false;
    });
    generateWorld();
    updateCamera();
    updateHUD();
    draw();
}

function gameLoop() {
    if (game.started) draw();
    requestAnimationFrame(gameLoop);
}

function handlePointer(x, y) {
    if (!game.started) return;

    if (game.dialogue.active) {
        advanceDialogue();
        return;
    }

    if (game.combat.inCombat && !game.showInventory) {
        handleCombatTouch(x, y);
        return;
    }

    if (game.showInventory) {
        handleInventoryTouch(x, y);
    }
}

function handleCombatTouch(x, y) {
    if (!game.combat.playerTurn) return;
    for (const btn of game.combat.buttons) {
        if (x >= btn.x && x <= btn.x + btn.width && y >= btn.y && y <= btn.y + btn.height) {
            if (btn.action === 'attack') combatAttack();
            if (btn.action === 'item') combatUseItem();
            if (btn.action === 'run') combatRun();
            return;
        }
    }
}

function handleInventoryTouch(x, y) {
    const invW = Math.min(560, canvasWidth - 40);
    const invH = Math.min(460, canvasHeight - 100);
    const invX = (canvasWidth - invW) / 2;
    const invY = (canvasHeight - invH) / 2;

    if (x < invX || x > invX + invW || y < invY || y > invY + invH) {
        game.showInventory = false;
        draw();
        return;
    }

    const cols = 5;
    const cell = Math.min(78, (invW - 60) / cols);
    const gridX = invX + (invW - cols * cell) / 2;
    const gridY = invY + 95;
    const col = Math.floor((x - gridX) / cell);
    const row = Math.floor((y - gridY) / cell);
    if (col >= 0 && col < cols && row >= 0 && row < 3) {
        const slot = row * cols + col;
        game.inventory.selectedSlot = slot;
        if (game.inventory.items[slot]) useItem(slot);
        else draw();
    }
}

document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        if (!game.started) return;
        if (game.dialogue.active || game.combat.inCombat) return;
        const dir = btn.dataset.dir;
        const action = btn.dataset.action;
        if (dir && !game.showInventory) handleDirection(dir);
        if (action === 'inventory') {
            game.showInventory = !game.showInventory;
            draw();
        }
    });
});

document.addEventListener('keydown', e => {
    if (!game.started) return;

    if (game.dialogue.active && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        advanceDialogue();
        return;
    }

    if (game.combat.inCombat && game.combat.playerTurn && !game.showInventory) {
        if (e.key.toLowerCase() === 'a' || e.key === ' ') {
            e.preventDefault();
            combatAttack();
        } else if (e.key.toLowerCase() === 'i') {
            e.preventDefault();
            combatUseItem();
        } else if (e.key.toLowerCase() === 'r') {
            e.preventDefault();
            combatRun();
        }
        return;
    }

    const keyMap = {
        arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right'
    };
    const dir = keyMap[e.key.toLowerCase()];
    if (dir && !game.showInventory && !game.combat.inCombat && !game.dialogue.active) {
        e.preventDefault();
        handleDirection(dir);
    } else if (e.key.toLowerCase() === 'i' && !game.combat.inCombat && !game.dialogue.active) {
        e.preventDefault();
        game.showInventory = !game.showInventory;
        draw();
    } else if (e.key.toLowerCase() === 'e' && game.showInventory) {
        e.preventDefault();
        useItem(game.inventory.selectedSlot);
    }
});

let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let touchStartTime = 0;

canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    touchStartTime = Date.now();
}, { passive: true });

canvas.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].clientX;
    touchEndY = e.changedTouches[0].clientY;
    const duration = Date.now() - touchStartTime;
    const moved = Math.hypot(touchEndX - touchStartX, touchEndY - touchStartY);

    if (!game.started) return;

    if (game.dialogue.active || game.combat.inCombat || game.showInventory) {
        handlePointer(touchEndX, touchEndY);
        return;
    }

    if (duration < 220 && moved < 12) {
        // Tap near player does nothing special in exploration
        return;
    }
    handleSwipe();
}, { passive: true });

canvas.addEventListener('click', e => {
    if (!game.started) return;
    if (game.dialogue.active || game.combat.inCombat || game.showInventory) {
        handlePointer(e.clientX, e.clientY);
    }
});

function handleSwipe() {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    const min = 28;
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > min) {
        handleDirection(deltaX > 0 ? 'right' : 'left');
    } else if (Math.abs(deltaY) > min) {
        handleDirection(deltaY > 0 ? 'down' : 'up');
    }
}

function handleDirection(dir) {
    if (!game.started) return;
    if (dir === 'up') movePlayer(0, -1);
    if (dir === 'down') movePlayer(0, 1);
    if (dir === 'left') movePlayer(-1, 0);
    if (dir === 'right') movePlayer(1, 0);
}

document.getElementById('start-btn').addEventListener('click', () => {
    game.started = true;
    document.getElementById('title').classList.add('hidden');
    showToast('Talk to the Guide nearby!');
});

generateWorld();
updateCamera();
updateHUD();
draw();
gameLoop();

console.log('Adventure Quest ready — turn-based combat, NPCs, buildings, quests');
