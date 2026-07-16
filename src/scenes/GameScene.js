import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Station from '../entities/Station.js';
import NPCShip from '../entities/NPCShip.js';
import Projectile from '../entities/Projectile.js';
import VirtualJoystick from '../utils/VirtualJoystick.js';
import GamepadControls from '../utils/GamepadControls.js';
import RemotePlayer from '../entities/RemotePlayer.js';
import { getSystem, linkedSystems, pickMission, SYSTEMS } from '../data/galaxy.js';
import { DEFEND_WAVES } from '../data/defendWaves.js';
import { HARVEST_REWARDS } from '../data/weapons.js';
import { ensureGameTextures } from '../utils/Textures.js';
import MultiplayerClient, { WORLD_ROOM } from '../net/MultiplayerClient.js';
import { powerFromPlayer, summarizeFleet, recipeForFleet, targetHostileCount } from '../net/WorldDirector.js';
import { BUILD_ID, BUILD_LABEL } from '../buildInfo.js';
import { resetQuoteCycle, QUOTE_TOTAL } from '../data/enemyQuotes.js';

const MAX_PLAYER_SHOTS = 8;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data = {}) {
        // Always drop into the shared Sol MMO — no lobby gate
        this.pilotName = data.pilotName
            || localStorage.getItem('spacenova_name')
            || 'Captain';
        this.mode = data.mode || 'joining';
        this.roomCode = data.roomCode || WORLD_ROOM;
        this.mp = data.mp || null;
        this.online = true;
    }

    create() {
        ensureGameTextures(this);
        // Fresh no-repeat pirate shout decks for this session
        resetQuoteCycle();

        this.worldSize = 10000;
        this.center = this.worldSize / 2;
        this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);

        this.currentSystemId = 'sol';
        this.activeMission = null;
        this.offeredMission = null;
        this.remotePlayers = new Map();
        this.lastNetSend = 0;
        this.fleetWaveIndex = 0;
        this.lastFleetKey = '';
        this.reconnecting = false;
        this.mapOpen = false;
        this.hyperspaceOpen = false;
        this.visitedSystems = new Set(['sol']);
        this.lastHudUpdate = 0;
        this.lastHudKey = '';
        this.markerPool = [];
        this.shipMarkerLabels = [];

        this.worldGraphics = [];
        this.npcs = [];
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.remoteProjectiles = [];
        this.lastFireTime = 0;
        this.isDocked = false;
        this.dockingUI = null;
        this.stationTab = 'trade';
        this.gameOver = false;
        this.statusMessage = '';
        this.statusMessageUntil = 0;
        this.enemyTier = 1;
        this.pendingSpawn = null;
        this.hyperspaceUI = null;
        this.mapUI = null;

        // Defend the Station mission state
        this.defendMode = true;
        this.defendWaveIndex = 0;
        this.defendWaveIds = new Set();
        this.defendComplete = false;
        this.pendingWaveSpawn = null;
        this.harvestQueue = [];
        this.mines = [];

        this.player = new Player(this, this.center - 800, this.center);
        this.cameras.main.startFollow(this.player.container, true, 0.08, 0.08);
        this.cameras.main.setBounds(0, 0, this.worldSize, this.worldSize);
        this.cameras.main.setZoom(1);
        this.cameras.main.roundPixels = true;

        this.setupTouchControls();
        this.gamepad = new GamepadControls(this);
        this.createHUD();
        this.createActionButtons();
        this.createEdgeMarkers();

        this.keys = this.input.keyboard.addKeys('W,A,S,D,J,K,E,Q,R,SPACE,H,M,SHIFT,LEFT,RIGHT');
        this.dockKey = this.keys.E;
        this.fireKey = this.keys.SPACE;
        this.portKey = this.keys.Q;
        this.starboardKey = this.keys.R;
        this.hyperspaceKey = this.keys.H;
        this.mapKey = this.keys.M;

        // Mouse aim + click-to-fire (desktop dogfight scheme)
        this._pointerFire = false;
        if (!this.touchEnabled) {
            this.input.on('pointerdown', (pointer) => {
                if (!pointer.leftButtonDown()) return;
                if (this.isDocked || this.mapOpen || this.hyperspaceOpen || this.gameOver) return;
                const hits = this.input.hitTestPointer(pointer);
                if (hits && hits.length > 0) return; // UI / joystick chrome
                this._pointerFire = true;
            });
            this.input.on('pointerup', () => { this._pointerFire = false; });
        }

        // One reticle: fire now + sail eventually
        this.reticle = this.add.circle(0, 0, 7, 0xc9a227, 0).setStrokeStyle(2, 0xc9a227, 0.95).setDepth(120);
        this.reticle.setVisible(!this.touchEnabled);
        this.cursorGhost = null;
        this.aimGfx = this.add.graphics().setDepth(88);
        this.batteryAim = null;
        if (this.player) {
            this.player.reticleAngle = this.player.rotation;
            this.player.gunAim = this.player.rotation;
            this.player.desiredHelm = this.player.rotation;
        }

        this.scale.on('resize', this.onResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());

        this.loadSystem('sol');
        this.showToast(`${BUILD_LABEL} · ${QUOTE_TOTAL.toLocaleString()} pirate shouts · no mid-fight repeats`, 5200);

        if (this.mp) {
            this.setupMultiplayer();
            this.broadcastHello();
            this.showToast(
                `AETHER ARCHIPELAGO · ${this.roomCode} · sail forth`,
                5200
            );
        } else {
            this.joinSharedWorld();
        }
    }

    async joinSharedWorld() {
        this.mp = new MultiplayerClient({
            onStatus: () => {},
            onPeer: () => {},
            onData: () => {},
            onClose: () => {}
        });
        try {
            const result = await this.mp.enterWorld(WORLD_ROOM);
            this.mode = result.mode;
            this.roomCode = result.roomCode;
            this.online = true;
            this.setupMultiplayer();
            this.broadcastHello();
            this.retuneFleetEncounters(true);
            this.showToast(
                result.mode === 'host'
                    ? `You hold the Sol Anchor (${result.roomCode}) — other sails will appear`
                    : `Underway on ${result.roomCode} — shared seas ahead`,
                4800
            );
        } catch (err) {
            this.mode = 'solo';
            this.online = false;
            this.showToast(
                `Harbor signal lost (${err.message || err}) — sailing solo until reconnect`,
                5000
            );
            // Retry a few times so late PeerJS / race conditions still land in the MMO
            this.time.delayedCall(4000, () => {
                if (!this.isMultiplayer()) this.retrySharedWorld();
            });
        }
    }

    async retrySharedWorld() {
        if (this.reconnecting || this.isMultiplayer()) return;
        this.reconnecting = true;
        try {
            if (this.mp) await this.mp.destroy();
            this.mp = new MultiplayerClient({
                onStatus: () => {},
                onPeer: () => {},
                onData: () => {},
                onClose: () => {}
            });
            const result = await this.mp.enterWorld(WORLD_ROOM);
            this.mode = result.mode;
            this.roomCode = result.roomCode;
            this.online = true;
            this.setupMultiplayer();
            this.broadcastHello();
            this.retuneFleetEncounters(true);
            this.showToast(`Rejoined Sol Haven (${result.roomCode})`, 3200);
        } catch (_) {
            this.reconnecting = false;
            this.time.delayedCall(8000, () => {
                if (!this.isMultiplayer()) this.retrySharedWorld();
            });
            return;
        }
        this.reconnecting = false;
    }

    setupMultiplayer() {
        if (!this.mp) return;

        this.mp.onData = (data) => this.handleNetMessage(data);
        this.mp.onPeer = (info) => {
            const n = info?.pilotCount || this.mp.pilotCount();
            this.showToast(`Sail sighted · ${n} in these waters`, 2200);
            this.broadcastHello();
            this.retuneFleetEncounters(true);
        };
        this.mp.onPeerLeave = (peerId) => {
            const remote = this.remotePlayers.get(peerId);
            if (remote) {
                this.showToast(`${remote.name} left Sol`, 2000);
                remote.destroy();
                this.remotePlayers.delete(peerId);
            }
            this.retuneFleetEncounters(true);
        };
        this.mp.onClose = async (info) => {
            this.showToast('Sol Anchor lost — reclaiming world…', 2800);
            for (const r of this.remotePlayers.values()) r.destroy();
            this.remotePlayers.clear();
            if (info?.reason === 'anchor_left' && this.online && !this.reconnecting) {
                this.reconnecting = true;
                try {
                    await this.mp.destroy();
                    const result = await this.mp.enterWorld(this.roomCode || WORLD_ROOM);
                    this.mode = result.mode;
                    this.roomCode = result.roomCode;
                    this.setupMultiplayer();
                    this.broadcastHello();
                    this.showToast(
                        result.mode === 'host' ? 'You are the new Sol Anchor' : 'Rejoined Sol traffic',
                        2600
                    );
                } catch (err) {
                    this.showToast(`Reconnect failed: ${err.message || err}`, 4000);
                }
                this.reconnecting = false;
            }
        };
    }

    isMultiplayer() {
        return Boolean(this.mp && this.mode !== 'solo' && this.mode !== 'joining');
    }

    broadcastHello() {
        if (!this.player) return;
        this.sendNet({
            type: 'hello',
            name: this.pilotName,
            systemId: this.currentSystemId,
            x: this.player.getX(),
            y: this.player.getY(),
            rotation: this.player.getRotation(),
            shields: this.player.shields,
            hull: this.player.hull,
            power: powerFromPlayer(this.player)
        });
    }

    sendNet(data) {
        if (!this.mp) return;
        this.mp.send(data);
    }

    getFleet() {
        return summarizeFleet(powerFromPlayer(this.player), this.remotePlayers);
    }

    retuneFleetEncounters(force = false) {
        if (!this.online || this.currentSystemId !== 'sol') return;
        const fleet = this.getFleet();
        const key = `${fleet.pilots}:${Math.round(fleet.avg)}`;
        if (!force && key === this.lastFleetKey) return;
        this.lastFleetKey = key;
        this.showToast(`Fleet power P${Math.round(fleet.power)} · ${fleet.pilots} pilot${fleet.pilots > 1 ? 's' : ''}`, 2400);

        // Top up hostiles toward fleet target without sponging existing ones
        const fighters = this.npcs.filter((n) => n.isCombatTarget() && n.type === 'fighter');
        const want = targetHostileCount(fleet);
        if (fighters.length < want && !this.pendingWaveSpawn) {
            this.queueFleetWave(900);
        }
    }

    queueFleetWave(delayMs = 1200) {
        if (this.pendingWaveSpawn) return;
        this.pendingWaveSpawn = { fleet: true, at: Date.now() + delayMs };
    }

    spawnFleetWave() {
        const fleet = this.getFleet();
        const recipe = recipeForFleet(fleet, this.fleetWaveIndex);
        this.fleetWaveIndex += 1;
        this.defendWaveIndex = this.fleetWaveIndex;
        this.defendWaveIds = new Set();

        const anchorX = this.station ? this.station.getX() : this.center;
        const anchorY = this.station ? this.station.getY() : this.center;
        let slot = 0;
        recipe.spawns.forEach((group) => {
            for (let i = 0; i < group.count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 580 + slot * 80 + Math.random() * 120;
                const id = `fleet_${this.fleetWaveIndex}_${group.archetype}_${i}_${Date.now()}`;
                const foe = new NPCShip(
                    this,
                    Phaser.Math.Clamp(anchorX + Math.cos(angle) * dist, 300, this.worldSize - 300),
                    Phaser.Math.Clamp(anchorY + Math.sin(angle) * dist, 300, this.worldSize - 300),
                    'fighter',
                    { archetype: group.archetype, waveId: this.fleetWaveIndex }
                );
                foe.defendId = id;
                this.npcs.push(foe);
                this.defendWaveIds.add(id);
                slot += 1;
            }
        });
        this.showToast(recipe.announce, 3600);
        this.sendNet({ type: 'fleet', fleet, wave: this.fleetWaveIndex, announce: recipe.announce });
    }

    loadSystem(systemId) {
        const system = getSystem(systemId);
        const center = this.worldSize / 2;

        this.hideStationUI();
        this.hideHyperspaceMenu();
        this.clearWorldObjects();

        this.currentSystemId = system.id;
        this.visitedSystems.add(system.id);
        this.enemyTier = Math.max(1, system.danger || 1);
        this.pendingSpawn = null;
        this.pendingWaveSpawn = null;
        this.defendWaveIndex = 0;
        this.defendWaveIds = new Set();
        this.defendComplete = false;
        this.harvestQueue = [];
        this.clearMines();
        this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);

        this.createStarField(this.worldSize, system.color);
        this.createPlanet(center, center, system.planet);
        this.createSystemBoundary(center, center, this.worldSize * 0.45, system.color);

        this.station = new Station(
            this,
            center + system.station.dx,
            center + system.station.dy,
            system.station.name,
            system.prices
        );

        // Sol: solo tutorial waves, or online fleet-scaled raids
        if (this.defendMode && system.id === 'sol') {
            this.spawnDefendTraders();
            this.placePlayerNearStation();
            if (this.online) {
                this.fleetWaveIndex = 0;
                this.queueFleetWave(1600);
            } else {
                this.startDefendWave(0, 1800);
            }
        } else {
            this.spawnNPCs(system.danger);
            this.placePlayerAtSpawn();
        }

        for (const remote of this.remotePlayers.values()) {
            remote.setInSystem(remote.systemId === this.currentSystemId);
        }

        const toast = system.id === 'sol'
            ? (this.online ? `Making ${system.name} — shared aether sea` : `Making ${system.name} — defend the harbor`)
            : `Making ${system.name} — ${system.blurb}`;
        this.showToast(toast, 3200);
        this.sendNet({
            type: 'system',
            systemId: this.currentSystemId,
            name: this.pilotName,
            power: powerFromPlayer(this.player)
        });
    }

    clearWorldObjects() {
        this.worldGraphics.forEach((obj) => obj?.destroy());
        this.worldGraphics = [];
        this.waveOverlay = null;
        this.wavePhase = 0;
        this.starfield = null;

        if (this.station) {
            this.station.destroy();
            this.station = null;
        }

        this.npcs.forEach((npc) => npc.destroy());
        this.npcs = [];
        this.clearAllProjectiles();
        this.clearMines();
        this.harvestQueue = [];
    }

    placePlayerAtSpawn() {
        if (!this.player) return;
        this.player.container.setPosition(this.center - 800, this.center);
        this.player.rotation = 0;
        this.player.rotationSpeed = 0;
        this.player.container.setRotation(0);
        this.player.body.setVelocity(0, 0);
        this.player.body.setAcceleration(0, 0);
    }

    placePlayerNearStation() {
        if (!this.player || !this.station) return;
        this.player.container.setPosition(this.station.getX() - 220, this.station.getY() + 40);
        this.player.rotation = -Math.PI / 2;
        this.player.rotationSpeed = 0;
        this.player.container.setRotation(this.player.rotation);
        this.player.body.setVelocity(0, 0);
        this.player.body.setAcceleration(0, 0);
    }

    spawnDefendTraders() {
        const c = this.worldSize / 2;
        this.npcs.push(new NPCShip(this, c + 900, c + 700, 'trader'));
    }

    spawnNPCs(danger = 1) {
        const c = this.worldSize / 2;
        this.npcs.push(new NPCShip(this, c + 300, c + 500, 'trader'));
        this.npcs.push(new NPCShip(this, c - 500, c + 300, 'trader'));

        const fighterCount = Phaser.Math.Clamp(Math.ceil(danger), 1, 4);
        for (let i = 0; i < fighterCount; i++) {
            const angle = (i / fighterCount) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
            const dist = 700 + i * 240 + danger * 90;
            this.npcs.push(new NPCShip(
                this,
                c + Math.cos(angle) * dist,
                c + Math.sin(angle) * dist,
                'fighter',
                { tier: Math.max(1, danger) }
            ));
        }
    }

    startDefendWave(index, delayMs = 1200) {
        if (index >= DEFEND_WAVES.length) {
            this.defendComplete = true;
            this.showToast('Station secure! Warmaster down — harvest wrecks for gear.', 5000);
            return;
        }
        this.pendingWaveSpawn = { index, at: Date.now() + delayMs };
    }

    spawnDefendWave(index) {
        const wave = DEFEND_WAVES[index];
        if (!wave) return;

        this.defendWaveIndex = index;
        this.defendWaveIds = new Set();
        const anchorX = this.station ? this.station.getX() : this.center;
        const anchorY = this.station ? this.station.getY() : this.center;

        let slot = 0;
        wave.spawns.forEach((group) => {
            for (let i = 0; i < group.count; i++) {
                const angle = -0.6 + slot * 0.45 + Phaser.Math.FloatBetween(-0.1, 0.1);
                const dist = 620 + slot * 70;
                const id = `w${wave.id}_${group.archetype}_${i}_${Date.now()}`;
                const foe = new NPCShip(
                    this,
                    anchorX + Math.cos(angle) * dist,
                    anchorY + Math.sin(angle) * dist,
                    'fighter',
                    { archetype: group.archetype, waveId: wave.id }
                );
                foe.defendId = id;
                this.npcs.push(foe);
                this.defendWaveIds.add(id);
                slot += 1;
            }
        });

        this.showToast(wave.announce, 3600);
    }

    onEnemyFled(npc) {
        if (!this.defendMode || this.defendComplete) return;
        if (npc.waveId == null) return;

        if (this.online) {
            const waveNpcs = this.npcs.filter((n) => n.waveId === npc.waveId && n.alive);
            const allRunningOrDown = waveNpcs.every((n) => n.hasFled || n.disabled);
            if (!allRunningOrDown || this.pendingWaveSpawn) return;
            this.queueFleetWave(1400);
            return;
        }

        const wave = DEFEND_WAVES[this.defendWaveIndex];
        if (!wave || npc.waveId !== wave.id) return;

        const waveNpcs = this.npcs.filter((n) => n.waveId === wave.id && n.alive);
        const allRunningOrDown = waveNpcs.every((n) => n.hasFled || n.disabled);
        if (!allRunningOrDown) return;
        if (this.pendingWaveSpawn) return;

        this.startDefendWave(this.defendWaveIndex + 1, 1600);
    }

    onEnemyDisabled(npc) {
        if (!npc || npc.type === 'trader') return;
        // Queue station harvest — wrecks become upgrades, not just kill credit
        if (npc.harvestQueued) return;
        npc.harvestQueued = true;
        this.harvestQueue.push({
            npc,
            at: Date.now() + 1600
        });
    }

    processHarvestQueue() {
        if (!this.station || this.isDocked) return;
        const now = Date.now();
        this.harvestQueue = this.harvestQueue.filter((job) => {
            if (!job.npc || !job.npc.alive || !job.npc.disabled) return false;
            if (now < job.at) return true;

            const npc = job.npc;
            this.playHarvestBeam(npc.getX(), npc.getY());
            const reward = HARVEST_REWARDS[this.player.harvestIndex % HARVEST_REWARDS.length];
            const prevWeapon = this.player.weaponId;
            this.player.grantHarvestReward(reward);
            this.player.credits += Math.floor(npc.bounty * 0.5);
            if (reward.kind === 'weapon' && reward.weaponId && this.player.weaponId !== prevWeapon) {
                const kit = this.player.getWeapon();
                this.showUpgradePopup({
                    title: `NEW GUN: ${kit.label.toUpperCase()}`,
                    subtitle: reward.toast || kit.description || '',
                    kind: 'gun'
                });
            } else if (reward.kind === 'shields' || reward.kind === 'armor') {
                this.showUpgradePopup({
                    title: reward.kind === 'shields' ? 'SHIP WARD REINFORCED' : 'SHIP HULL REINFORCED',
                    subtitle: reward.toast || '',
                    kind: 'ship'
                });
            } else {
                this.showToast(reward.toast, 3200);
            }
            if (this.online) this.retuneFleetEncounters(true);

            // Remove inert wreck after salvage
            this.time.delayedCall(400, () => {
                npc.destroy();
            });
            return false;
        });
    }

    playHarvestBeam(x, y) {
        if (!this.station) return;
        const beam = this.add.graphics().setDepth(90);
        beam.lineStyle(3, 0x66ffcc, 0.85);
        beam.lineBetween(this.station.getX(), this.station.getY(), x, y);
        beam.fillStyle(0xaaffee, 0.7);
        beam.fillCircle(x, y, 10);
        this.tweens.add({
            targets: beam,
            alpha: 0,
            duration: 700,
            onComplete: () => beam.destroy()
        });
    }

    spawnEnemyMine(x, y) {
        const mine = this.add.circle(x, y, 7, 0xff2266, 0.85).setDepth(70);
        mine.armAt = Date.now() + 700;
        mine.lifeUntil = Date.now() + 9000;
        mine.radius = 48;
        mine.damage = 14;
        this.mines.push(mine);
        this.tweens.add({
            targets: mine,
            scale: 1.25,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
    }

    clearMines() {
        (this.mines || []).forEach((m) => m.destroy());
        this.mines = [];
    }

    updateMines() {
        const now = Date.now();
        this.mines = this.mines.filter((mine) => {
            if (!mine.active) return false;
            if (now > mine.lifeUntil) {
                mine.destroy();
                return false;
            }
            if (now < mine.armAt || this.gameOver || this.isDocked) return true;
            const dist = Phaser.Math.Distance.Between(
                mine.x, mine.y,
                this.player.getX(), this.player.getY()
            );
            if (dist < mine.radius) {
                const dead = this.player.takeDamage(mine.damage);
                this.spawnExplosion(mine.x, mine.y);
                this.cameras.main.shake(90, 0.005);
                mine.destroy();
                if (dead) this.triggerGameOver();
                return false;
            }
            return true;
        });
    }

    createStarField(worldSize, color = 0xffffff) {
        // Pirates-on-the-aether-sea: deep water blues, foam sparkles, living waves
        this.cameras.main.setBackgroundColor('#0a3a62');

        const sea = this.add.graphics();
        sea.setDepth(-120);
        // Deep water body
        sea.fillStyle(0x0a3a62, 1);
        sea.fillRect(0, 0, worldSize, worldSize);
        // Mid-depth wash patches (read as shoals / light through water)
        for (let i = 0; i < 28; i++) {
            const cx = Phaser.Math.Between(0, worldSize);
            const cy = Phaser.Math.Between(0, worldSize);
            const r = Phaser.Math.Between(180, 520);
            sea.fillStyle(i % 3 === 0 ? 0x0e4a78 : 0x125a88, 0.22);
            sea.fillEllipse(cx, cy, r * 1.6, r);
        }
        // Static deep-current ribbons (parallax world layer)
        for (let i = 0; i < 18; i++) {
            const y = (i / 18) * worldSize + Phaser.Math.Between(-60, 60);
            sea.lineStyle(2, 0x1a6a9a, 0.2);
            sea.beginPath();
            sea.moveTo(0, y);
            for (let x = 0; x < worldSize; x += 160) {
                sea.lineTo(x, y + Math.sin(x * 0.008 + i * 0.7) * 36);
            }
            sea.strokePath();
        }
        sea.setScrollFactor(0.02);
        this.worldGraphics.push(sea);

        // Foam / star-phosphorescence on the sea
        const foam = this.add.graphics();
        foam.setDepth(-105);
        for (let i = 0; i < 160; i++) {
            const x = Phaser.Math.Between(0, worldSize);
            const y = Phaser.Math.Between(0, worldSize);
            const size = Phaser.Math.FloatBetween(0.5, 2.2);
            const bright = i % 6 === 0;
            foam.fillStyle(
                bright ? color : (i % 4 === 0 ? 0xd8f0ff : 0xffffff),
                Phaser.Math.FloatBetween(0.25, 0.75)
            );
            foam.fillCircle(x, y, size);
        }
        foam.setScrollFactor(0.05);
        this.worldGraphics.push(foam);
        this.starfield = foam;

        // Screen-space animated wave overlay (cheap; follows camera)
        if (this.waveOverlay) this.waveOverlay.destroy();
        this.waveOverlay = this.add.graphics().setScrollFactor(0).setDepth(-90);
        this.wavePhase = 0;
        this.worldGraphics.push(this.waveOverlay);
        this.drawWaveOverlay(0);

        return foam;
    }

    /**
     * Animated water surface — sine swells across the viewport.
     * Keeps pirates-in-space: blue sea of stars, not a flat void.
     */
    drawWaveOverlay(phase) {
        const g = this.waveOverlay;
        if (!g) return;
        g.clear();

        const w = this.scale.width;
        const h = this.scale.height;
        if (w < 8 || h < 8) return;

        // Soft sky-sea wash at top of view
        g.fillStyle(0x146090, 0.08);
        g.fillRect(0, 0, w, h * 0.35);

        const bands = [
            { spacing: 52, amp: 9, speed: 1.0, color: 0x5eb8e0, alpha: 0.16, step: 14 },
            { spacing: 74, amp: 14, speed: 0.65, color: 0x8fd4f0, alpha: 0.12, step: 18 },
            { spacing: 110, amp: 20, speed: 0.4, color: 0xffffff, alpha: 0.07, step: 22 }
        ];

        for (const band of bands) {
            g.lineStyle(1.5, band.color, band.alpha);
            for (let row = 0; row < h + band.spacing; row += band.spacing) {
                const yBase = row + Math.sin(phase * band.speed * 0.35 + row * 0.02) * 6;
                g.beginPath();
                g.moveTo(0, yBase);
                for (let x = 0; x <= w; x += band.step) {
                    const y = yBase
                        + Math.sin(x * 0.018 + phase * band.speed + row * 0.05) * band.amp
                        + Math.sin(x * 0.007 - phase * band.speed * 0.6) * (band.amp * 0.45);
                    g.lineTo(x, y);
                }
                g.strokePath();
            }
        }

        // Occasional foam crests (bright short strokes)
        g.lineStyle(2, 0xe8f6ff, 0.14);
        for (let i = 0; i < 7; i++) {
            const cx = ((phase * 40 + i * 137) % (w + 80)) - 40;
            const cy = ((i * 97 + phase * 18) % h);
            g.beginPath();
            g.moveTo(cx, cy);
            for (let t = 0; t < 60; t += 8) {
                g.lineTo(cx + t, cy + Math.sin(t * 0.2 + phase + i) * 4);
            }
            g.strokePath();
        }
    }

    updateAetherSea(delta) {
        if (!this.waveOverlay) return;
        this.wavePhase = (this.wavePhase || 0) + delta * 0.0018;
        // ~30Hz redraw — enough motion, light on Safari
        this._waveFrame = (this._waveFrame || 0) + 1;
        if (this._waveFrame % 2 === 0) this.drawWaveOverlay(this.wavePhase);
    }

    createPlanet(x, y, planetDef) {
        const radius = planetDef.radius || 280;
        const land = planetDef.color || 0x2f6b4f;
        const water = planetDef.water || 0x2a5a8a;
        const kind = planetDef.kind || 'isle';
        const planet = this.add.graphics();

        // Gravity well / reef ring (shallows) — leave this to catch deep lanes
        planet.lineStyle(3, 0x3a8aaa, 0.28);
        planet.strokeCircle(x, y, radius + 120);
        planet.lineStyle(2, 0xc9a227, 0.18);
        planet.strokeCircle(x, y, radius + 160);
        planet.fillStyle(water, 0.22);
        planet.fillCircle(x, y, radius + 90);

        // Island body — irregular coast
        planet.fillStyle(water, 0.85);
        planet.fillCircle(x, y, radius);
        planet.fillStyle(land, 1);
        planet.fillEllipse(x - radius * 0.05, y, radius * 1.5, radius * 1.15);
        // Second lobe for cay/atoll character
        if (kind === 'cay' || kind === 'atoll' || kind === 'reef') {
            planet.fillEllipse(x + radius * 0.35, y + radius * 0.2, radius * 0.9, radius * 0.7);
        }
        if (kind === 'atoll') {
            planet.fillStyle(water, 1);
            planet.fillCircle(x, y, radius * 0.35);
        }
        // Inland highlight
        planet.fillStyle(0xffffff, 0.12);
        planet.fillEllipse(x - radius * 0.25, y - radius * 0.2, radius * 0.7, radius * 0.45);
        // Tiny harbor cove notch
        planet.fillStyle(water, 1);
        planet.fillCircle(x + radius * 0.55, y - radius * 0.1, radius * 0.18);

        // Sparse timber / cliffs for Age-of-Sail silhouette
        if (kind !== 'holm') {
            planet.fillStyle(0x1a3a28, 0.85);
            for (let i = 0; i < 5; i++) {
                const a = -0.8 + i * 0.35;
                const tx = x + Math.cos(a) * radius * 0.35;
                const ty = y + Math.sin(a) * radius * 0.25 - radius * 0.15;
                planet.fillTriangle(tx, ty - 14, tx - 6, ty + 4, tx + 6, ty + 4);
            }
        } else {
            planet.fillStyle(0xffffff, 0.35);
            planet.fillEllipse(x, y - radius * 0.1, radius * 0.9, radius * 0.55);
        }

        planet.lineStyle(2, 0xe8dcc0, 0.25);
        planet.strokeCircle(x, y, radius);
        planet.setDepth(-50);
        this.worldGraphics.push(planet);
        this.planet = {
            x, y, radius,
            name: planetDef.name,
            color: land,
            wellRadius: radius + 160
        };

        // Floating label
        const isleLabel = this.add.text(x, y + radius + 36, planetDef.name || 'Isle', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '14px',
            fill: '#c9a227',
            backgroundColor: '#061018aa',
            padding: { x: 6, y: 3 }
        }).setOrigin(0.5).setDepth(-45);
        this.worldGraphics.push(isleLabel);

        return planet;
    }

    createSystemBoundary(centerX, centerY, radius, color = 0xc9a227) {
        // Deep-lane ring — leave the gravity well / island waters to jump
        const boundary = this.add.graphics();
        const segments = 64;
        for (let i = 0; i < segments; i++) {
            const startAngle = (i * 2 * Math.PI) / segments;
            const endAngle = startAngle + (Math.PI / segments) * 0.55;
            boundary.lineStyle(2, color, i % 2 === 0 ? 0.55 : 0.25);
            boundary.beginPath();
            boundary.arc(centerX, centerY, radius, startAngle, endAngle);
            boundary.strokePath();
        }
        // Outer "deep" wash
        boundary.lineStyle(1, 0x33aacc, 0.2);
        boundary.strokeCircle(centerX, centerY, radius + 40);
        boundary.setDepth(-40);
        this.worldGraphics.push(boundary);
        this.boundary = boundary;
        this.hyperspaceRadius = radius;
        return boundary;
    }

    setupTouchControls() {
        this.touchEnabled = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.leftJoystick = null;
        this.rightJoystick = null;
        this.leftLabel = null;
        this.rightLabel = null;

        // Keep touch optional — only show virtual sticks on actual touch devices
        // so laptop keyboard / Xbox pad users aren't fighting on-screen controls.
        if (!this.touchEnabled) return;

        const margin = 20;
        const joystickRadius = 50;
        const bottomMargin = 30;

        this.leftJoystick = new VirtualJoystick(
            this,
            margin + joystickRadius,
            this.scale.height - bottomMargin - joystickRadius,
            joystickRadius,
            'left'
        );

        this.rightJoystick = new VirtualJoystick(
            this,
            this.scale.width - margin - joystickRadius,
            this.scale.height - bottomMargin - joystickRadius,
            joystickRadius,
            'right'
        );

        this.leftLabel = this.add.text(
            margin + joystickRadius,
            this.scale.height - bottomMargin - joystickRadius - 70,
            'SAIL',
            { fontSize: '12px', fill: '#777' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

        this.rightLabel = this.add.text(
            this.scale.width - margin - joystickRadius,
            this.scale.height - bottomMargin - joystickRadius - 70,
            'AIM',
            { fontSize: '12px', fill: '#777' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    }

    createHUD() {
        // Static panel — never recreate Text backgrounds every frame (Safari killer)
        this.hudPanel = this.add.rectangle(12, 12, 500, 318, 0x0c1018, 0.78)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(1999)
            .setStrokeStyle(1, 0xc9a227, 0.55);

        this.hudText = this.add.text(22, 18, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '12px',
            fill: '#e8dcc0',
            lineSpacing: 2
        }).setScrollFactor(0).setDepth(2000);

        // Graphical status meters (shields / hull / guns / yard progress)
        this.statusGfx = this.add.graphics().setScrollFactor(0).setDepth(2001);
        this.statusLabels = this.add.text(22, 168, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '11px',
            fill: '#c9b896',
            lineSpacing: 5
        }).setScrollFactor(0).setDepth(2002);

        this.toastText = this.add.text(this.scale.width / 2, 70, '', {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3100).setAlpha(0);

        // Big upgrade celebration banner
        this.upgradeBannerBg = this.add.rectangle(
            this.scale.width / 2, this.scale.height * 0.28, 420, 96, 0x1a140c, 0.94
        ).setStrokeStyle(2, 0xc9a227, 0.95).setScrollFactor(0).setDepth(3200).setAlpha(0);
        this.upgradeBannerTitle = this.add.text(this.scale.width / 2, this.scale.height * 0.28 - 16, '', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '26px',
            fill: '#ffe08a',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3201).setAlpha(0);
        this.upgradeBannerSub = this.add.text(this.scale.width / 2, this.scale.height * 0.28 + 18, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '13px',
            fill: '#e8dcc0',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3201).setAlpha(0);
        this._upgradeBannerUntil = 0;

        // World-space integrity ring over the ship
        this.shipStatusGfx = this.add.graphics().setDepth(105);
        this.lastStatusDraw = 0;
    }

    createActionButtons() {
        this.dockButton = this.add.text(
            this.scale.width / 2 - 68,
            this.scale.height - 48,
            'DOCK',
            {
                fontSize: '18px',
                fill: '#e8dcc0',
                backgroundColor: '#2a1e10',
                padding: { x: 18, y: 10 }
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1500).setAlpha(0).setInteractive();

        this.dockButton.on('pointerdown', () => this.attemptDocking());

        this.hyperspaceButton = this.add.text(
            this.scale.width / 2 + 72,
            this.scale.height - 48,
            'DEEP',
            {
                fontSize: '18px',
                fill: '#a8d4e8',
                backgroundColor: '#0c2030',
                padding: { x: 18, y: 10 }
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1500).setAlpha(0).setInteractive();

        this.hyperspaceButton.on('pointerdown', () => this.attemptHyperspace());

        this.fireButton = this.add.circle(
            this.scale.width / 2,
            this.scale.height - 140,
            28,
            0xff3333,
            0.45
        ).setStrokeStyle(2, 0xff7777).setScrollFactor(0).setDepth(1500).setInteractive();

        this.fireButton.on('pointerdown', () => this.fireWeapon());

        this.fireLabel = this.add.text(
            this.scale.width / 2,
            this.scale.height - 140,
            'VOLLEY',
            { fontSize: '12px', fill: '#ffffff' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1501);

        if (!this.touchEnabled) {
            this.fireButton.setVisible(false).disableInteractive();
            this.fireLabel.setVisible(false);
        }
    }

    showToast(message, duration = 2800) {
        this.statusMessage = message;
        this.statusMessageUntil = Date.now() + duration;
        this.toastText.setText(message);
        this.toastText.setAlpha(1);
    }

    /**
     * Celebration popup for new gun kits or shipyard upgrades.
     * @param {{ title: string, subtitle?: string, kind?: 'gun'|'ship'|'gear' }} opts
     */
    showUpgradePopup(opts) {
        const title = opts.title || 'Upgrade';
        const subtitle = opts.subtitle || '';
        const kind = opts.kind || 'gear';
        const stroke = kind === 'gun' ? 0x66ffcc : (kind === 'ship' ? 0xc9a227 : 0xaaddff);

        this.upgradeBannerTitle.setText(title);
        this.upgradeBannerSub.setText(subtitle);
        this.upgradeBannerBg.setStrokeStyle(2, stroke, 0.95);
        this.upgradeBannerBg.setPosition(this.scale.width / 2, this.scale.height * 0.28);
        this.upgradeBannerTitle.setPosition(this.scale.width / 2, this.scale.height * 0.28 - 16);
        this.upgradeBannerSub.setPosition(this.scale.width / 2, this.scale.height * 0.28 + 18);

        const targets = [this.upgradeBannerBg, this.upgradeBannerTitle, this.upgradeBannerSub];
        targets.forEach((t) => {
            t.setAlpha(0);
            t.setScale(0.85);
        });
        this.tweens.add({
            targets,
            alpha: 1,
            scale: 1,
            duration: 220,
            ease: 'Back.Out'
        });
        this._upgradeBannerUntil = Date.now() + 3800;
        // Also echo in the small toast
        this.showToast(`${title}${subtitle ? ` — ${subtitle}` : ''}`, 3200);
    }

    hideUpgradePopupIfExpired() {
        if (!this._upgradeBannerUntil || Date.now() < this._upgradeBannerUntil) return;
        if (this.upgradeBannerBg.alpha <= 0) {
            this._upgradeBannerUntil = 0;
            return;
        }
        this._upgradeBannerUntil = 0;
        this.tweens.add({
            targets: [this.upgradeBannerBg, this.upgradeBannerTitle, this.upgradeBannerSub],
            alpha: 0,
            duration: 280
        });
    }

    drawMeterBar(g, x, y, w, h, frac, fillColor, trackColor = 0x1a1a22) {
        const f = Phaser.Math.Clamp(frac, 0, 1);
        g.fillStyle(trackColor, 0.95);
        g.fillRoundedRect(x, y, w, h, 3);
        if (f > 0.001) {
            g.fillStyle(fillColor, 1);
            g.fillRoundedRect(x + 1, y + 1, Math.max(2, (w - 2) * f), h - 2, 2);
        }
        g.lineStyle(1, 0xc9a227, 0.35);
        g.strokeRoundedRect(x, y, w, h, 3);
    }

    drawPips(g, x, y, filled, total, onColor, offColor) {
        for (let i = 0; i < total; i++) {
            const px = x + i * 11;
            g.fillStyle(i < filled ? onColor : offColor, i < filled ? 0.95 : 0.35);
            g.fillCircle(px, y, 3.5);
        }
    }

    updateStatusVisuals() {
        if (!this.player || !this.statusGfx) return;
        const p = this.player;
        const g = this.statusGfx;
        g.clear();

        const left = 22;
        const barW = 210;
        const barH = 11;
        let y = 172;

        const shieldFrac = p.maxShields > 0 ? p.shields / p.maxShields : 0;
        const hullFrac = p.maxHull > 0 ? p.hull / p.maxHull : 0;
        const portFrac = p.sideReloadFrac('port');
        const stbdFrac = p.sideReloadFrac('starboard');
        const next = p.getNextUpgradeTarget();

        // Ward
        this.drawMeterBar(g, left + 54, y, barW, barH, shieldFrac, 0x44c8e8);
        this.drawPips(g, left + 54 + barW + 12, y + 5, p.getIntegrityPips('shields', 10), 10, 0x66e0ff, 0x335566);
        y += 22;
        // Hull
        this.drawMeterBar(g, left + 54, y, barW, barH, hullFrac, hullFrac < 0.35 ? 0xff5533 : 0xc9a227);
        this.drawPips(g, left + 54 + barW + 12, y + 5, p.getIntegrityPips('hull', 10), 10, 0xffcc66, 0x554422);
        y += 22;
        // Guns — two shorter bars
        const gunW = 96;
        this.drawMeterBar(g, left + 54, y, gunW, barH, portFrac, portFrac >= 1 ? 0x66ff99 : 0x88aa66);
        this.drawMeterBar(g, left + 54 + gunW + 18, y, gunW, barH, stbdFrac, stbdFrac >= 1 ? 0x66ff99 : 0x88aa66);
        y += 22;
        // Yard upgrade progress
        if (next) {
            const color = next.need <= 0 ? 0xffe08a : 0xaa8844;
            this.drawMeterBar(g, left + 54, y, barW, barH, next.frac, color);
        } else {
            this.drawMeterBar(g, left + 54, y, barW, barH, 1, 0x668866);
        }

        const weapon = p.getWeapon();
        const portReady = portFrac >= 1;
        const stbdReady = stbdFrac >= 1;
        const yardLine = next
            ? `${next.label} Lv${next.level}→${next.level + 1}  ${next.have}/${next.cost}c` +
              (next.need > 0 ? `  (−${next.need}c)` : '  READY')
            : 'Yard: all upgrades MAX';

        this.statusLabels.setText([
            `WARD  ${Math.round(p.shields)}/${p.maxShields}   pips ${p.getIntegrityPips('shields', 10)}/10`,
            `HULL  ${Math.round(p.hull)}/${p.maxHull}   pips ${p.getIntegrityPips('hull', 10)}/10`,
            `GUNS  P ${portReady ? 'READY' : `${Math.round(portFrac * 100)}%`}   S ${stbdReady ? 'READY' : `${Math.round(stbdFrac * 100)}%`}   ${weapon.label} ×${p.getVolleyCount()}`,
            `YARD  ${yardLine}`
        ].join('\n'));

        // World-space ring over ship
        this.drawShipStatusOverlay();
    }

    drawShipStatusOverlay() {
        if (!this.shipStatusGfx || !this.player) return;
        const g = this.shipStatusGfx;
        g.clear();
        const x = this.player.getX();
        const y = this.player.getY();
        const p = this.player;
        const shieldFrac = p.maxShields > 0 ? p.shields / p.maxShields : 0;
        const hullFrac = p.maxHull > 0 ? p.hull / p.maxHull : 0;

        // Shield arc
        if (shieldFrac > 0.02) {
            g.lineStyle(2.5, 0x44c8e8, 0.35 + shieldFrac * 0.5);
            g.beginPath();
            g.arc(x, y, 26, -Math.PI * 0.75, -Math.PI * 0.75 + Math.PI * 1.5 * shieldFrac, false);
            g.strokePath();
        }

        // Hull pips under the keel
        const total = 8;
        const filled = p.getIntegrityPips('hull', total);
        const startX = x - (total - 1) * 4;
        for (let i = 0; i < total; i++) {
            g.fillStyle(i < filled ? 0xc9a227 : 0x333018, i < filled ? 0.9 : 0.35);
            g.fillCircle(startX + i * 8, y + 30, 2.4);
        }

        // Soft hull tint ring when damaged
        if (hullFrac < 0.45) {
            g.lineStyle(1.5, 0xff5533, 0.45 * (1 - hullFrac));
            g.strokeCircle(x, y, 22);
        }
    }

    fireWeapon() {
        this.fireBroadside('auto');
    }

    /**
     * Side volley toward the mouse/stick — anywhere but the rear quadrant.
     * Balls spawn along the keel on the aimed beam (broadside rail).
     * @param {'port'|'starboard'|'auto'} side  reload battery; auto picks aimed side
     */
    fireBroadside(side = 'auto') {
        if (this.gameOver || this.isDocked) return;

        const fireAngle = this.player.getFireAngle();
        let resolved = side;
        if (side === 'auto') {
            resolved = this.player.nextReadyBattery();
            if (!resolved) return;
        } else if (!this.player.sideReady(resolved)) {
            return;
        }

        const kit = this.player.getWeapon();
        const guns = this.player.getVolleyCount();
        const spread = this.player.getVolleySpread();
        const originX = this.player.getX();
        const originY = this.player.getY();
        const muzzle = kit.muzzle || 28;
        const keelSpacing = kit.keelSpacing || 10;
        const mid = (guns - 1) / 2;
        const facing = this.player.getRotation();
        const beamFx = Math.sin(facing);
        const beamFy = -Math.cos(facing);
        // Which rail: toward the fire bearing
        const rel = Phaser.Math.Angle.Wrap(fireAngle - facing);
        const sideSign = rel >= 0 ? 1 : -1;
        const sideFx = Math.cos(facing) * sideSign;
        const sideFy = Math.sin(facing) * sideSign;

        for (let i = 0; i < guns; i++) {
            const offset = guns === 1 ? 0 : (i - mid) * spread;
            const shotAngle = fireAngle + offset;
            const along = guns === 1 ? 0 : (i - mid) * keelSpacing;
            const sx = originX + beamFx * along + sideFx * muzzle;
            const sy = originY + beamFy * along + sideFy * muzzle;

            const projectile = new Projectile(this, sx, sy, shotAngle, {
                speed: kit.speed,
                color: kit.color,
                radius: Math.max(4, kit.radius || 4),
                lifetime: kit.lifetime,
                damage: kit.damage || 1,
                friendly: true,
                blast: kit.blast || 0,
                kind: 'bomb',
                seek: Boolean(kit.seek),
                scale: 0.68,
                trail: true
            });
            this.projectiles.push(projectile);
        }
        this.trimPlayerShots();

        this.player.markVolleyFired(resolved);
        this.spawnBroadsideFlash(resolved, fireAngle);

        this.sendNet({
            type: 'fire',
            name: this.pilotName,
            x: originX,
            y: originY,
            rotation: fireAngle,
            systemId: this.currentSystemId,
            weaponId: this.player.weaponId,
            side: resolved,
            guns
        });
    }

    /** Keep at most MAX_PLAYER_SHOTS aloft — oldest balls expire first. */
    trimPlayerShots() {
        while (this.projectiles.length > MAX_PLAYER_SHOTS) {
            const oldest = this.projectiles.shift();
            if (oldest && typeof oldest.destroyBolt === 'function') oldest.destroyBolt();
            else if (oldest && typeof oldest.destroy === 'function') oldest.destroy();
        }
    }

    spawnBroadsideFlash(_side, angle) {
        const x = this.player.getX();
        const y = this.player.getY();
        const ax = Math.sin(angle);
        const ay = -Math.cos(angle);
        const flash = this.add.circle(x + ax * 34, y + ay * 34, 14, 0xffeebb, 0.9).setDepth(115);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2.8,
            duration: 220,
            onComplete: () => flash.destroy()
        });
    }

    spawnRemoteProjectile(data) {
        if (data.systemId && data.systemId !== this.currentSystemId) return;
        const projectile = new Projectile(
            this,
            data.x,
            data.y,
            data.rotation,
            {
                speed: 520,
                damage: 0,
                friendly: false,
                lifetime: 1200,
                color: 0x33ddff,
                radius: 5,
                kind: 'bomb',
                scale: 0.85,
                trail: true
            }
        );
        this.remoteProjectiles.push(projectile);
    }

    spawnEnemyProjectile(npc, opts = {}) {
        // Single slow ball — same duel language as the player (lead / juke)
        const player = this.player;
        let fireAngle;
        if (player && opts.towardPlayer !== false) {
            const dx = player.getX() - npc.getX();
            const dy = player.getY() - npc.getY();
            fireAngle = Math.atan2(dx, -dy);
            // Light lead based on player velocity
            const lead = 0.35;
            const dist = Math.hypot(dx, dy);
            const shotSpeed = opts.speed || 105;
            const tta = dist / Math.max(80, shotSpeed);
            const lx = player.getX() + (player.body?.velocity?.x || 0) * tta * lead;
            const ly = player.getY() + (player.body?.velocity?.y || 0) * tta * lead;
            fireAngle = Math.atan2(lx - npc.getX(), -(ly - npc.getY()));
        } else {
            const facing = npc.getRotation();
            const side = opts.side || 'starboard';
            fireAngle = side === 'port' ? facing - Math.PI / 2 : facing + Math.PI / 2;
        }

        const shotSpeed = opts.speed || 105;
        const muzzle = 26;
        const aimFx = Math.sin(fireAngle);
        const aimFy = -Math.cos(fireAngle);
        const sx = npc.getX() + aimFx * muzzle;
        const sy = npc.getY() + aimFy * muzzle;

        const projectile = new Projectile(this, sx, sy, fireAngle, {
            speed: shotSpeed,
            damage: Math.max(5, Math.round((npc.shotDamage || 8) * 0.55)),
            friendly: false,
            lifetime: 4200,
            color: npc.color || 0xff6644,
            radius: 5.5,
            kind: 'bomb',
            scale: 0.75,
            trail: true
        });
        this.enemyProjectiles.push(projectile);
    }

    /**
     * Mouse / stick gun aim — legal everywhere except the rear quadrant.
     */
    getNavalAim(pad = null) {
        if (this.isDocked || this.mapOpen || this.hyperspaceOpen || this.gameOver) {
            if (this.reticle) this.reticle.setVisible(false);
            if (this.aimGfx) this.aimGfx.clear();
            return { hasAim: false, angle: 0 };
        }

        if (!this.player) {
            if (this.aimGfx) this.aimGfx.clear();
            return { hasAim: false, angle: 0 };
        }

        let worldX = null;
        let worldY = null;
        let angle = null;

        if (!this.touchEnabled) {
            const pointer = this.input.activePointer;
            if (pointer) {
                const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                worldX = world.x;
                worldY = world.y;
                const dx = worldX - this.player.getX();
                const dy = worldY - this.player.getY();
                if (dx * dx + dy * dy >= 64) {
                    angle = Math.atan2(dx, -dy);
                }
            }
        }

        if (angle == null && pad && pad.hasAim) {
            const reach = 240;
            angle = pad.aimAngle;
            worldX = this.player.getX() + Math.sin(angle) * reach;
            worldY = this.player.getY() + -Math.cos(angle) * reach;
        }

        if (angle != null) {
            this.player.setGunAimAngle(angle);
            if (worldX != null) this.player.setReticleWorld(worldX, worldY);
        }

        this.batteryAim = this.player.getAimState();

        if (!this.touchEnabled) {
            this.drawReticleCues(worldX, worldY);
        } else {
            // Touch: still show a light fan when aiming with right stick
            if (this.rightJoystick?.isActive?.() && this.rightJoystick.getForce() > 0.28) {
                this.drawReticleCues(this.player.cursorX, this.player.cursorY);
            } else if (this.aimGfx) {
                this.aimGfx.clear();
                if (this.reticle) this.reticle.setVisible(false);
            }
        }

        return {
            hasAim: angle != null,
            angle: this.player.getFireAngle(),
            cursorX: worldX,
            cursorY: worldY
        };
    }

    getMouseAim() {
        return this.getNavalAim(null);
    }

    /**
     * Aim cues:
     * - brass fan = side volley toward cursor (clamped out of stern)
     * - dim wedge = forbidden rear quadrant
     * - teal = velocity · white = bow
     */
    drawReticleCues(cursorX, cursorY) {
        if (!this.aimGfx || !this.player) return;
        const g = this.aimGfx;
        g.clear();

        const p = this.player;
        const kit = p.getWeapon();
        const x = p.getX();
        const y = p.getY();
        const facing = p.getRotation();
        const fireAng = p.getFireAngle();
        const aim = p.getAimState();
        const range = Math.min(420, (kit.speed || 155) * ((kit.lifetime || 4500) / 1000) * 0.7);
        const ready = Boolean(p.nextReadyBattery());
        const guns = p.getVolleyCount();
        const spread = p.getVolleySpread();
        const dir = (ang) => ({ dx: Math.sin(ang), dy: -Math.cos(ang) });
        const arc = Math.PI * 0.75;

        // Forbidden rear quadrant (stern ±45°)
        const stern = facing + Math.PI;
        g.fillStyle(0xff3355, 0.08);
        g.beginPath();
        g.moveTo(x, y);
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            const a = stern - Math.PI / 4 + (Math.PI / 2) * (i / steps);
            g.lineTo(x + Math.sin(a) * 70, y + -Math.cos(a) * 70);
        }
        g.closePath();
        g.fillPath();

        // Arc edge ticks
        for (const edge of [-arc, arc]) {
            const e = dir(facing + edge);
            g.lineStyle(1, 0xff6688, 0.35);
            g.lineBetween(x + e.dx * 24, y + e.dy * 24, x + e.dx * 64, y + e.dy * 64);
        }

        // Actual travel
        const spd = p.getSpeed();
        if (spd > 10) {
            const v = dir(p.getVelocityAngle());
            const vLen = Phaser.Math.Clamp(40 + spd * 0.9, 50, 150);
            g.lineStyle(3, 0x5ec8c0, 0.7);
            g.lineBetween(x, y, x + v.dx * vLen, y + v.dy * vLen);
        }

        // Bow
        const bow = dir(facing);
        g.lineStyle(2, 0xffffff, 0.4);
        g.lineBetween(x - bow.dx * 18, y - bow.dy * 18, x + bow.dx * 52, y + bow.dy * 52);

        // Side volley fan toward clamped aim
        const rayColor = aim.clamped ? 0xaa6644 : (ready ? 0xc9a227 : 0x886622);
        const mid = (guns - 1) / 2;
        for (let i = 0; i < guns; i++) {
            const offset = guns === 1 ? 0 : (i - mid) * spread;
            const d = dir(fireAng + offset);
            const alpha = ready ? (i === mid || guns === 1 ? 0.9 : 0.5) : 0.28;
            g.lineStyle(guns <= 2 ? 2.5 : 1.5, rayColor, alpha);
            g.lineBetween(x + d.dx * 18, y + d.dy * 18, x + d.dx * range, y + d.dy * range);
        }

        // Cursor reticle (shows clamp pull when in rear)
        const rx = cursorX != null ? cursorX : p.cursorX;
        const ry = cursorY != null ? cursorY : p.cursorY;
        if (rx != null && ry != null) {
            g.lineStyle(2, rayColor, ready ? 0.95 : 0.4);
            g.strokeCircle(rx, ry, aim.clamped ? 10 : 12);
            g.lineBetween(rx - 9, ry, rx + 9, ry);
            g.lineBetween(rx, ry - 9, rx, ry + 9);
            if (aim.clamped) {
                const c = dir(fireAng);
                g.lineStyle(1, 0xff8866, 0.55);
                g.lineBetween(rx, ry, x + c.dx * 80, y + c.dy * 80);
            }
        }

        if (this.reticle) {
            this.reticle.setVisible(true);
            this.reticle.setPosition(rx, ry);
            this.reticle.setStrokeStyle(2, rayColor, 0.95);
        }
    }

    // Keep old name as alias during transition
    drawSailAimCues(cursorX, cursorY) {
        this.drawReticleCues(cursorX, cursorY);
    }

    attemptDocking() {
        if (this.gameOver || !this.station) return;
        if (this.isDocked) {
            this.undock();
            return;
        }
        const distance = Phaser.Math.Distance.Between(
            this.player.getX(), this.player.getY(),
            this.station.getX(), this.station.getY()
        );
        if (distance < this.station.dockingRadius) {
            this.dock();
        }
    }

    dock() {
        this.isDocked = true;
        this.player.body.setVelocity(0, 0);
        this.player.body.setAcceleration(0, 0);
        this.clearAllProjectiles();
        this.freezeNPCs();
        this.checkMissionDockCompletion();
        this.showStationUI();
        this.dockButton.setText('UNDOCK');
        this.dockButton.setAlpha(1);
        this.showToast(`Made harbor at ${this.station.getName()} — guns quiet while berthed`);
    }

    undock() {
        this.isDocked = false;
        this.hideStationUI();
        this.dockButton.setText('DOCK');
        this.showToast('Cast off. Fair winds.');
    }

    clearAllProjectiles() {
        this.projectiles.forEach((p) => p.destroy());
        this.enemyProjectiles.forEach((p) => p.destroy());
        this.remoteProjectiles.forEach((p) => p.destroy());
        this.projectiles = [];
        this.enemyProjectiles = [];
        this.remoteProjectiles = [];
    }

    freezeNPCs() {
        this.npcs.forEach((npc) => {
            if (!npc.alive || !npc.body) return;
            npc.body.setVelocity(0, 0);
            npc.body.setAcceleration(0, 0);
            if (npc.mode === 'attack' || npc.mode === 'flee') {
                npc.mode = 'patrol';
            }
        });
    }

    showStationUI() {
        if (this.dockingUI) return;
        this.stationTab = 'trade';
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const panelW = Math.min(500, this.scale.width * 0.92);
        const panelH = Math.min(560, this.scale.height * 0.84);

        const overlay = this.add.rectangle(cx, cy, panelW, panelH, 0x0c1018, 0.96)
            .setStrokeStyle(2, 0xc9a227)
            .setScrollFactor(0)
            .setDepth(2500);

        const title = this.add.text(cx, cy - panelH / 2 + 24, this.station.getName(), {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '20px',
            fill: '#e8dcc0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        const tabY = cy - panelH / 2 + 60;
        const tradeTab = this.makeStationButton(cx - 140, tabY, 'Trade', () => {
            this.stationTab = 'trade';
            this.rebuildStationBody();
        });
        const upgradeTab = this.makeStationButton(cx, tabY, 'Yard', () => {
            this.stationTab = 'upgrades';
            this.rebuildStationBody();
        });
        const missionTab = this.makeStationButton(cx + 140, tabY, 'Charters', () => {
            this.stationTab = 'missions';
            this.rebuildStationBody();
        });

        this.stationStatus = this.add.text(cx, cy - panelH / 2 + 100, '', {
            fontSize: '12px',
            fill: '#c8b890',
            align: 'center',
            wordWrap: { width: panelW - 38 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        this.dockingUI = {
            overlay,
            title,
            tabs: [tradeTab, upgradeTab, missionTab],
            buttons: [],
            status: this.stationStatus,
            panelW,
            panelH,
            cx,
            cy
        };
        this.rebuildStationBody();
    }

    clearStationBodyButtons() {
        if (!this.dockingUI) return;
        this.dockingUI.buttons.forEach((b) => b.destroy());
        this.dockingUI.buttons = [];
    }

    rebuildStationBody() {
        if (!this.dockingUI) return;
        this.clearStationBodyButtons();
        const { cx, cy, panelH } = this.dockingUI;
        const buttons = this.dockingUI.buttons;

        if (this.stationTab === 'trade') {
            const goods = [
                { key: 'food', label: 'Provisions' },
                { key: 'ore', label: 'Timber' },
                { key: 'tech', label: 'Charts' }
            ];
            goods.forEach((good, index) => {
                const y = cy - 24 + index * 52;
                buttons.push(this.makeStationButton(cx - 105, y, `Buy ${good.label}`, () => this.buyGood(good.key)));
                buttons.push(this.makeStationButton(cx + 105, y, `Sell ${good.label}`, () => this.sellGood(good.key)));
            });
            buttons.push(this.makeStationButton(cx, cy + panelH / 2 - 48, 'Careen & Repair', () => {
                const result = this.player.repair(2);
                this.showToast(result.message);
                this.refreshStationStatus();
            }));
        } else if (this.stationTab === 'upgrades') {
            const defs = Player.getUpgradeDefs();
            Object.keys(defs).forEach((key, index) => {
                const def = defs[key];
                const level = this.player.getUpgradeLevel(key);
                const cost = this.player.getUpgradeCost(key);
                const y = cy - 58 + index * 48;
                const label = cost === null
                    ? `${def.label} Lv${level} MAX`
                    : `${def.label} Lv${level} → ${level + 1} (${cost}c)`;
                buttons.push(this.makeStationButton(cx, y, label, () => this.buyUpgrade(key)));
            });
        } else {
            this.buildMissionTab();
        }

        this.refreshStationStatus();
    }

    buildMissionTab() {
        const { cx, cy, panelH } = this.dockingUI;
        const buttons = this.dockingUI.buttons;

        if (!this.activeMission) {
            if (!this.offeredMission || this.offeredMission.from !== this.currentSystemId) {
                this.offeredMission = pickMission(this.currentSystemId);
            }
            buttons.push(this.makeStationButton(cx, cy + 86, 'Accept Mission', () => this.acceptMission()));
            buttons.push(this.makeStationButton(cx, cy + 136, 'New Offer', () => {
                this.offeredMission = pickMission(this.currentSystemId);
                this.rebuildStationBody();
            }));
        } else {
            buttons.push(this.makeStationButton(cx, cy + panelH / 2 - 48, 'Abandon Mission', () => {
                const title = this.activeMission.title;
                this.activeMission = null;
                this.showToast(`${title} abandoned.`);
                this.rebuildStationBody();
            }));
        }
    }

    acceptMission() {
        if (!this.offeredMission) return;
        this.activeMission = { ...this.offeredMission, active: true, progress: this.offeredMission.progress || 0 };
        this.offeredMission = null;
        this.showToast(`Accepted: ${this.activeMission.title}`, 2400);
        this.rebuildStationBody();
    }

    completeMission(message = null) {
        if (!this.activeMission) return;
        const mission = this.activeMission;
        this.player.credits += mission.reward || 0;
        this.activeMission = null;
        this.offeredMission = null;
        this.showToast(message || `${mission.title} complete! +${mission.reward}c`, 3200);
        if (this.dockingUI) this.rebuildStationBody();
    }

    checkMissionDockCompletion() {
        if (!this.activeMission) return;
        const mission = this.activeMission;
        if (mission.type === 'scout' && mission.dest === this.currentSystemId) {
            this.completeMission(`Scout report delivered! +${mission.reward}c`);
            return;
        }

        if (mission.type === 'haul' && mission.dest === this.currentSystemId) {
            const carried = this.player.cargo[mission.good] || 0;
            if (carried >= mission.amount) {
                this.player.cargo[mission.good] -= mission.amount;
                this.completeMission(`Delivered ${mission.amount} ${mission.good}. +${mission.reward}c`);
            } else {
                this.showToast(`Need ${mission.amount} ${mission.good}; carrying ${carried}.`, 2800);
            }
        }
    }

    recordBountyKill(npc) {
        if (!this.activeMission || this.activeMission.type !== 'bounty' || npc.type !== 'fighter') return;
        this.activeMission.progress = (this.activeMission.progress || 0) + 1;
        const target = this.activeMission.count || 1;
        if (this.activeMission.progress >= target) {
            this.completeMission(`Bounty complete! +${this.activeMission.reward}c`);
        } else {
            this.showToast(`Bounty progress ${this.activeMission.progress}/${target}`, 1800);
        }
    }

    formatMission(mission) {
        if (!mission) return '';
        const dest = mission.destName || (mission.dest ? getSystem(mission.dest).name : '');
        const desc = (mission.desc || '')
            .replace('{dest}', dest)
            .replace('{count}', String(mission.count || 0));
        if (mission.type === 'haul') {
            return `${mission.title}\n${desc}\nCargo: ${mission.amount} ${mission.good} · Reward: ${mission.reward}c`;
        }
        if (mission.type === 'bounty') {
            return `${mission.title}\n${desc}\nProgress: ${mission.progress || 0}/${mission.count} · Reward: ${mission.reward}c`;
        }
        return `${mission.title}\n${desc}\nDestination: ${dest} · Reward: ${mission.reward}c`;
    }

    buyUpgrade(key) {
        const result = this.player.buyUpgrade(key);
        if (result.ok) {
            const kind = result.kind || 'gear';
            const title = kind === 'gun'
                ? `GUN CREW Lv${result.level}`
                : (kind === 'ship' ? `${result.label.toUpperCase()} UPGRADED` : result.label.toUpperCase());
            this.showUpgradePopup({
                title,
                subtitle: result.message,
                kind
            });
        } else {
            this.showToast(result.message);
        }
        this.rebuildStationBody();
    }

    makeStationButton(x, y, label, onClick) {
        const btn = this.add.text(x, y, label, {
            fontSize: '14px',
            fill: '#e8dcc0',
            backgroundColor: '#2a1e10',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2502).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', onClick);
        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#3d2e18' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#2a1e10' }));
        return btn;
    }

    refreshStationStatus() {
        if (!this.stationStatus) return;
        const p = this.player;
        const prices = this.station.prices;
        const u = p.upgrades;

        if (this.stationTab === 'upgrades') {
            this.stationStatus.setText([
                `Purse: ${p.credits}   Prizes: ${p.kills}`,
                `Rig ${u.engines}  Ward ${u.shields}  Hull ${u.hull}  Guns ${u.weapons}  Hold ${u.cargo}`,
                `Reload ${p.reloadMs || p.fireRate}ms  Hold ${p.cargoCapacity}  Hull speed ${Math.round(p.body.maxVelocityX)}`
            ].join('\n'));
            return;
        }

        if (this.stationTab === 'missions') {
            const mission = this.activeMission || this.offeredMission;
            this.stationStatus.setText(mission
                ? this.formatMission(mission)
                : 'No charters posted today.'
            );
            return;
        }

        this.stationStatus.setText([
            `Purse: ${p.credits}`,
            `Hold: ${p.getCargoUsed()}/${p.cargoCapacity}  (Prov ${p.cargo.food} · Timber ${p.cargo.ore} · Charts ${p.cargo.tech})`,
            `Hull ${Math.round(p.hull)}/${p.maxHull}  Ward ${Math.round(p.shields)}/${p.maxShields}`,
            `Prices  Prov ${prices.food.buy}/${prices.food.sell}  Timber ${prices.ore.buy}/${prices.ore.sell}  Charts ${prices.tech.buy}/${prices.tech.sell}`
        ].join('\n'));
    }

    buyGood(key) {
        const price = this.station.prices[key].buy;
        if (this.player.credits < price) {
            this.showToast('Not enough credits.');
            return;
        }
        if (this.player.getCargoUsed() >= this.player.cargoCapacity) {
            this.showToast('Cargo hold full.');
            return;
        }
        this.player.credits -= price;
        this.player.cargo[key] += 1;
        this.showToast(`Bought 1 ${key} for ${price}c`);
        this.refreshStationStatus();
    }

    sellGood(key) {
        if (this.player.cargo[key] <= 0) {
            this.showToast(`No ${key} to sell.`);
            return;
        }
        const price = this.station.prices[key].sell;
        this.player.cargo[key] -= 1;
        this.player.credits += price;
        this.showToast(`Sold 1 ${key} for ${price}c`);
        this.refreshStationStatus();
    }

    hideStationUI() {
        if (!this.dockingUI) return;
        this.dockingUI.overlay.destroy();
        this.dockingUI.title.destroy();
        this.dockingUI.tabs.forEach((t) => t.destroy());
        this.dockingUI.status.destroy();
        this.dockingUI.buttons.forEach((b) => b.destroy());
        this.dockingUI = null;
        this.stationStatus = null;
    }

    isNearHyperspaceEdge() {
        const dist = Phaser.Math.Distance.Between(
            this.player.getX(),
            this.player.getY(),
            this.center,
            this.center
        );
        const rim = this.hyperspaceRadius || this.worldSize * 0.45;
        return dist > rim * 0.92;
    }

    attemptHyperspace() {
        if (this.gameOver || this.isDocked) return;
        if (!this.isNearHyperspaceEdge()) {
            this.showToast('Sail beyond the gravity well (outer brass ring) to catch a deep lane.', 2800);
            return;
        }
        this.openHyperspaceMenu();
    }

    openHyperspaceMenu() {
        if (this.hyperspaceOpen) {
            this.hideHyperspaceMenu();
            return;
        }

        const destinations = linkedSystems(this.currentSystemId);
        if (destinations.length === 0) {
            this.showToast('No deep lanes charted from this island.', 2200);
            return;
        }

        this.hyperspaceOpen = true;
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const panelW = Math.min(440, this.scale.width * 0.9);
        const panelH = 160 + destinations.length * 46;
        const overlay = this.add.rectangle(cx, cy, panelW, panelH, 0x0c1018, 0.96)
            .setStrokeStyle(2, 0xc9a227)
            .setScrollFactor(0)
            .setDepth(2700);
        const title = this.add.text(cx, cy - panelH / 2 + 26, 'DEEP HYPERSPACE LANES', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '18px',
            fill: '#e8dcc0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2701);
        const hint = this.add.text(
            cx,
            cy - panelH / 2 + 54,
            `Leaving ${getSystem(this.currentSystemId).name}'s gravity well`,
            {
                fontSize: '12px',
                fill: '#88aacc'
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(2701);

        const items = [overlay, title, hint];
        destinations.forEach((dest, index) => {
            const btn = this.makeOverlayButton(
                cx,
                cy - panelH / 2 + 100 + index * 46,
                `Sail to ${dest.name}  —  ${dest.blurb}`,
                () => this.jumpTo(dest.id),
                2702
            );
            items.push(btn);
        });
        items.push(this.makeOverlayButton(cx, cy + panelH / 2 - 28, 'Remain in these waters', () => this.hideHyperspaceMenu(), 2702));

        this.hyperspaceUI = { items };
    }

    hideHyperspaceMenu() {
        if (!this.hyperspaceUI) {
            this.hyperspaceOpen = false;
            return;
        }
        this.hyperspaceUI.items.forEach((item) => item.destroy());
        this.hyperspaceUI = null;
        this.hyperspaceOpen = false;
    }

    jumpTo(systemId) {
        const linked = linkedSystems(this.currentSystemId).some((sys) => sys.id === systemId);
        if (!linked) {
            this.showToast('No direct deep lane charted.', 2000);
            return;
        }

        this.hideHyperspaceMenu();
        this.hideGalaxyMap();
        this.showToast(`Riding the deep lane to ${getSystem(systemId).name}...`, 1200);
        this.cameras.main.fadeOut(180, 0, 0, 0);
        this.time.delayedCall(220, () => {
            this.loadSystem(systemId);
            this.visitedSystems.add(systemId);
            this.sendNet({ type: 'hyperspace', systemId, name: this.pilotName });
            this.cameras.main.fadeIn(260, 0, 0, 0);
        });
    }

    toggleGalaxyMap() {
        if (this.mapOpen) this.hideGalaxyMap();
        else this.showGalaxyMap();
    }

    showGalaxyMap() {
        this.hideGalaxyMap();
        this.mapOpen = true;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const panelW = Math.min(680, this.scale.width * 0.94);
        const panelH = Math.min(560, this.scale.height * 0.88);
        const scale = Math.min(1.2, Math.max(0.75, panelW / 620));
        const items = [];

        const overlay = this.add.rectangle(cx, cy, panelW, panelH, 0x061018, 0.97)
            .setStrokeStyle(2, 0xc9a227)
            .setScrollFactor(0)
            .setDepth(2800);
        items.push(overlay);

        const title = this.add.text(cx, cy - panelH / 2 + 28, 'AETHER CHART', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '20px',
            fill: '#e8dcc0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2801);
        items.push(title);

        const graph = this.add.graphics().setScrollFactor(0).setDepth(2801);
        const originX = cx;
        const originY = cy - 26;
        const plotted = {};

        Object.values(SYSTEMS).forEach((sys) => {
            plotted[sys.id] = {
                x: originX + sys.mapX * scale,
                y: originY + sys.mapY * scale
            };
        });

        const drawnLinks = new Set();
        Object.values(SYSTEMS).forEach((sys) => {
            sys.links.forEach((destId) => {
                const key = [sys.id, destId].sort().join(':');
                if (drawnLinks.has(key) || !plotted[destId]) return;
                drawnLinks.add(key);
                graph.lineStyle(2, 0x6a8aaa, 0.55);
                graph.lineBetween(plotted[sys.id].x, plotted[sys.id].y, plotted[destId].x, plotted[destId].y);
            });
        });

        Object.values(SYSTEMS).forEach((sys) => {
            const p = plotted[sys.id];
            const current = sys.id === this.currentSystemId;
            const visited = this.visitedSystems.has(sys.id);
            graph.fillStyle(sys.color, current ? 1 : (visited ? 0.85 : 0.35));
            graph.fillCircle(p.x, p.y, current ? 10 : 7);
            graph.lineStyle(current ? 3 : 1, current ? 0xffdd66 : 0xffffff, visited ? 0.8 : 0.3);
            graph.strokeCircle(p.x, p.y, current ? 16 : 11);

            const label = this.add.text(p.x, p.y + 18, sys.name, {
                fontSize: '11px',
                fill: current ? '#ffdd66' : (visited ? '#ffffff' : '#778099')
            }).setOrigin(0.5).setScrollFactor(0).setDepth(2802);
            items.push(label);
        });
        items.push(graph);

        const links = linkedSystems(this.currentSystemId).map((sys) => sys.name).join(' · ');
        items.push(this.add.text(cx, cy + panelH / 2 - 76, `Island: ${getSystem(this.currentSystemId).name}`, {
            fontSize: '14px',
            fill: '#c9a227'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2802));
        items.push(this.add.text(cx, cy + panelH / 2 - 50, `Deep lanes: ${links || 'none'}`, {
            fontSize: '12px',
            fill: '#a8c8d8',
            wordWrap: { width: panelW - 40 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2802));
        items.push(this.makeOverlayButton(cx, cy + panelH / 2 - 22, 'Close [M]', () => this.hideGalaxyMap(), 2802));

        this.mapUI = { items };
    }

    hideGalaxyMap() {
        if (!this.mapUI) {
            this.mapOpen = false;
            return;
        }
        this.mapUI.items.forEach((item) => item.destroy());
        this.mapUI = null;
        this.mapOpen = false;
    }

    makeOverlayButton(x, y, label, onClick, depth = 2700) {
        const btn = this.add.text(x, y, label, {
            fontSize: '13px',
            fill: '#e8dcc0',
            backgroundColor: '#2a1e10',
            padding: { x: 12, y: 8 },
            align: 'center',
            wordWrap: { width: Math.min(460, this.scale.width * 0.78) }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depth).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#3d2e18' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#2a1e10' }));
        btn.on('pointerdown', onClick);
        return btn;
    }

    handleCombat() {
        const seekTarget = this.npcs.find((n) => n.isCombatTarget() && n.type === 'fighter') || null;

        const dt = this.game.loop.delta;
        this.projectiles = this.projectiles.filter((proj) => {
            if (!proj.update(undefined, dt, seekTarget)) return false;

            const hitList = [];
            for (const npc of this.npcs) {
                if (!npc.isCombatTarget()) continue;
                const dist = Phaser.Math.Distance.Between(proj.getX(), proj.getY(), npc.getX(), npc.getY());
                const hitRad = 26 + (proj.blastRadius ? 0 : 0);
                if (dist < hitRad) hitList.push(npc);
            }

            if (hitList.length === 0) return true;

            const applyHit = (npc) => {
                const result = npc.takeDamage(1);
                if (result === 'disabled') {
                    this.player.credits += npc.bounty;
                    this.player.kills += 1;
                    this.showToast(`${npc.label || npc.type} disabled! Station inbound for salvage.`, 2400);
                    this.spawnExplosion(npc.getX(), npc.getY());
                    this.recordBountyKill(npc);
                    if (!this.defendMode && npc.type === 'fighter') {
                        this.queueTougherFighter(npc.tier);
                    }
                } else if (result === 'critical') {
                    this.showToast(`${npc.label || 'Enemy'} breaking off — they're running!`, 1800);
                }
            };

            if (proj.blastRadius > 0) {
                const bx = proj.getX();
                const by = proj.getY();
                this.spawnExplosion(bx, by);
                for (const npc of this.npcs) {
                    if (!npc.isCombatTarget()) continue;
                    const dist = Phaser.Math.Distance.Between(bx, by, npc.getX(), npc.getY());
                    if (dist < proj.blastRadius) applyHit(npc);
                }
            } else {
                applyHit(hitList[0]);
            }

            if (typeof proj.destroyBolt === 'function') proj.destroyBolt();
            else proj.destroy();
            return false;
        });

        this.enemyProjectiles = this.enemyProjectiles.filter((proj) => {
            if (!proj.update(undefined, dt)) return false;
            const dist = Phaser.Math.Distance.Between(
                proj.getX(), proj.getY(),
                this.player.getX(), this.player.getY()
            );
            if (dist < 26) {
                const dead = this.player.takeDamage(proj.damage);
                if (typeof proj.destroyBolt === 'function') proj.destroyBolt();
                else proj.destroy();
                this.cameras.main.shake(70, 0.0035);
                if (dead) this.triggerGameOver();
                return false;
            }
            return true;
        });

        this.remoteProjectiles = this.remoteProjectiles.filter((proj) => proj.update(undefined, dt));

        this.handleRamming();
    }

    /**
     * Hull-on-hull ramming: bow contact + closing speed deals damage and knockback.
     * Glancing scrapes shove ships apart with light shield sting.
     */
    handleRamming() {
        if (!this.player?.body || this.isDocked || this.gameOver) return;
        const now = this.time.now;
        const px = this.player.getX();
        const py = this.player.getY();
        const pvx = this.player.body.velocity.x;
        const pvy = this.player.body.velocity.y;
        const pSpeed = Math.hypot(pvx, pvy);
        const pFwdX = Math.sin(this.player.rotation);
        const pFwdY = -Math.cos(this.player.rotation);

        for (const npc of this.npcs) {
            if (!npc?.body || !npc.isCombatTarget()) continue;
            const nx = npc.getX();
            const ny = npc.getY();
            const dist = Math.hypot(nx - px, ny - py);
            if (dist > 36 || dist < 0.5) continue;

            const dx = (nx - px) / dist;
            const dy = (ny - py) / dist;
            const nvx = npc.body.velocity.x;
            const nvy = npc.body.velocity.y;
            const closing = (pvx - nvx) * dx + (pvy - nvy) * dy;

            // Always ease overlapping hulls apart
            if (dist < 30) {
                const push = (30 - dist) * 2.2;
                this.player.body.velocity.x -= dx * push * 0.55;
                this.player.body.velocity.y -= dy * push * 0.55;
                npc.body.velocity.x += dx * push * 0.7;
                npc.body.velocity.y += dy * push * 0.7;
            }

            if (closing < 32) continue;
            if (npc._ramCooldownUntil && now < npc._ramCooldownUntil) continue;
            if (this.player.ramCooldownUntil && now < this.player.ramCooldownUntil) continue;

            const nFacing = typeof npc.getRotation === 'function' ? npc.getRotation() : npc.container.rotation;
            const nFwdX = Math.sin(nFacing);
            const nFwdY = -Math.cos(nFacing);
            const playerBow = pFwdX * dx + pFwdY * dy;
            const enemyBow = nFwdX * (-dx) + nFwdY * (-dy);
            const impact = Phaser.Math.Clamp(closing / 100, 0.4, 1.5);

            let playerDmg = 0;
            let enemyHits = 0;
            let bowRam = false;

            if (playerBow > 0.42 && pSpeed > 28) {
                enemyHits = 1;
                playerDmg += 5 * impact;
                bowRam = true;
            }
            if (enemyBow > 0.42) {
                playerDmg += 12 * impact;
            }
            if (!bowRam && enemyBow <= 0.42) {
                // Broadside scrape
                playerDmg = Math.max(playerDmg, 4 * impact);
            }

            npc._ramCooldownUntil = now + 950;
            this.player.ramCooldownUntil = now + 550;

            const knock = 100 + closing * 0.45;
            this.player.body.velocity.x -= dx * knock * 0.6;
            this.player.body.velocity.y -= dy * knock * 0.6;
            npc.body.velocity.x += dx * knock * 0.75;
            npc.body.velocity.y += dy * knock * 0.75;

            const midX = (px + nx) * 0.5;
            const midY = (py + ny) * 0.5;
            this.spawnHitSpark(midX, midY);
            this.spawnRamBurst(midX, midY);
            this.cameras.main.shake(90, 0.0045 + impact * 0.002);

            if (enemyHits > 0) {
                const result = npc.takeDamage(enemyHits);
                this.showToast(bowRam ? 'RAMMING SPEED!' : 'Hull clash!', 1200);
                if (result === 'disabled') {
                    this.player.credits += npc.bounty;
                    this.player.kills += 1;
                    this.showToast(`${npc.label || npc.type} stove in by the ram!`, 2400);
                    this.spawnExplosion(npc.getX(), npc.getY());
                    this.recordBountyKill(npc);
                    if (!this.defendMode && npc.type === 'fighter') {
                        this.queueTougherFighter(npc.tier);
                    }
                } else if (result === 'critical') {
                    this.showToast(`${npc.label || 'Enemy'} reeling from the ram!`, 1600);
                }
            }

            if (playerDmg > 0) {
                const dead = this.player.takeDamage(playerDmg);
                if (dead) this.triggerGameOver();
            }
        }
    }

    spawnRamBurst(x, y) {
        const ring = this.add.circle(x, y, 10, 0xffe0a0, 0.85).setDepth(125);
        if (Phaser.BlendModes) ring.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
            targets: ring,
            scale: 3.2,
            alpha: 0,
            duration: 220,
            onComplete: () => ring.destroy()
        });
    }

    spawnHitSpark(x, y) {
        const spark = this.add.circle(x, y, 4, 0xffffff, 0.95).setDepth(130);
        this.tweens.add({
            targets: spark,
            scale: 2.2,
            alpha: 0,
            duration: 140,
            onComplete: () => spark.destroy()
        });
    }

    spawnExplosion(x, y) {
        const burst = this.add.circle(x, y, 8, 0xffaa33, 0.9).setDepth(120);
        this.tweens.add({
            targets: burst,
            scale: 4,
            alpha: 0,
            duration: 280,
            onComplete: () => burst.destroy()
        });
    }

    queueTougherFighter(defeatedTier) {
        this.enemyTier = Math.max(this.enemyTier, defeatedTier + 1);
        this.pendingSpawn = {
            tier: this.enemyTier,
            at: Date.now() + 2200
        };
        this.showToast(`Hostile signal inbound — Tier ${this.enemyTier}`, 2400);
    }

    maybeRespawnNPCs() {
        if (this.defendMode && this.currentSystemId === 'sol') {
            if (this.pendingWaveSpawn && Date.now() >= this.pendingWaveSpawn.at) {
                const pending = this.pendingWaveSpawn;
                this.pendingWaveSpawn = null;
                if (pending.fleet || this.online) this.spawnFleetWave();
                else this.spawnDefendWave(pending.index);
            }
            this.processHarvestQueue();
            this.npcs = this.npcs.filter((n) => n.alive);
            return;
        }

        const traders = this.npcs.filter((n) => n.alive && n.type === 'trader' && !n.disabled);
        if (traders.length < 2) {
            const c = this.worldSize / 2;
            const angle = Math.random() * Math.PI * 2;
            const dist = 700 + Math.random() * 1000;
            this.npcs.push(new NPCShip(
                this,
                c + Math.cos(angle) * dist,
                c + Math.sin(angle) * dist,
                'trader'
            ));
        }

        if (this.pendingSpawn && Date.now() >= this.pendingSpawn.at) {
            const activeFighters = this.npcs.filter((n) => n.isCombatTarget() && n.type === 'fighter');
            if (activeFighters.length === 0) {
                this.spawnFighterNearPlayer(this.pendingSpawn.tier);
            }
            this.pendingSpawn = null;
        }

        this.npcs = this.npcs.filter((n) => n.alive);
    }

    spawnFighterNearPlayer(tier) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 550 + Math.random() * 250;
        const x = Phaser.Math.Clamp(this.player.getX() + Math.cos(angle) * dist, 300, this.worldSize - 300);
        const y = Phaser.Math.Clamp(this.player.getY() + Math.sin(angle) * dist, 300, this.worldSize - 300);
        const foe = new NPCShip(this, x, y, 'fighter', { tier });
        this.npcs.push(foe);
        this.showToast(`Tier ${tier} corsair closing!`, 2200);
    }

    createEdgeMarkers() {
        this.markerLabels = {
            planet: this.add.text(0, 0, 'ISLE', {
                fontFamily: 'Georgia, serif', fontSize: '10px', fill: '#c9a227'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1801).setAlpha(0),
            station: this.add.text(0, 0, 'HARBOR', {
                fontFamily: 'Georgia, serif', fontSize: '10px', fill: '#e8dcc0'
            }).setOrigin(0.5).setScrollFactor(0).setDepth(1801).setAlpha(0)
        };
        this.shipMarkerLabels = [];
        this.markerPool = [];
    }

    acquireMarker() {
        let m = this.markerPool.find((img) => !img.activeUse);
        if (!m) {
            m = this.add.image(0, 0, 'edgeMarker')
                .setScrollFactor(0)
                .setDepth(1800)
                .setOrigin(0.5, 0.85);
            this.markerPool.push(m);
        }
        m.activeUse = true;
        m.setActive(true).setVisible(true);
        return m;
    }

    isOnScreen(worldX, worldY, pad = 40) {
        const cam = this.cameras.main;
        const view = cam.worldView;
        return (
            worldX > view.x - pad &&
            worldX < view.x + view.width + pad &&
            worldY > view.y - pad &&
            worldY < view.y + view.height + pad
        );
    }

    projectToEdge(worldX, worldY) {
        const cam = this.cameras.main;
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const view = cam.worldView;
        const sx = (worldX - view.x) / cam.zoom;
        const sy = (worldY - view.y) / cam.zoom;
        const dx = sx - cx;
        const dy = sy - cy;
        const angle = Math.atan2(dy, dx);

        const margin = 28;
        const hw = this.scale.width / 2 - margin;
        const hh = this.scale.height / 2 - margin;
        const tan = Math.tan(angle);
        let ex;
        let ey;

        if (Math.abs(dx) * hh > Math.abs(dy) * hw) {
            ex = dx > 0 ? hw : -hw;
            ey = ex * tan;
            if (ey > hh) ey = hh;
            if (ey < -hh) ey = -hh;
        } else {
            ey = dy > 0 ? hh : -hh;
            ex = ey / (tan || 0.0001);
            if (ex > hw) ex = hw;
            if (ex < -hw) ex = -hw;
        }

        return { x: cx + ex, y: cy + ey, angle };
    }

    placeEdgeMarker(x, y, angle, color, size = 10) {
        const m = this.acquireMarker();
        m.setPosition(x, y);
        m.setRotation(angle + Math.PI / 2);
        m.setTint(color);
        m.setScale(size / 14);
        return m;
    }

    updateEdgeMarkers() {
        for (const m of this.markerPool) m.activeUse = false;

        const hideLabel = (label) => { if (label) label.setAlpha(0); };

        if (this.planet) {
            if (this.isOnScreen(this.planet.x, this.planet.y, 60)) {
                hideLabel(this.markerLabels.planet);
            } else {
                const edge = this.projectToEdge(this.planet.x, this.planet.y);
                this.placeEdgeMarker(edge.x, edge.y, edge.angle, 0x66aaff, 12);
                this.markerLabels.planet.setPosition(
                    edge.x - Math.cos(edge.angle) * 18,
                    edge.y - Math.sin(edge.angle) * 18
                ).setAlpha(0.9);
            }
        }

        if (this.station) {
            const sx = this.station.getX();
            const sy = this.station.getY();
            if (this.isOnScreen(sx, sy, 60)) {
                hideLabel(this.markerLabels.station);
            } else {
                const edge = this.projectToEdge(sx, sy);
                this.placeEdgeMarker(edge.x, edge.y, edge.angle, 0x44ff88, 11);
                this.markerLabels.station.setPosition(
                    edge.x - Math.cos(edge.angle) * 18,
                    edge.y - Math.sin(edge.angle) * 18
                ).setAlpha(0.9);
            }
        }

        let labelIdx = 0;
        for (const npc of this.npcs) {
            if (!npc.alive) continue;
            if (this.isOnScreen(npc.getX(), npc.getY(), 50)) continue;
            const color = npc.disabled ? 0x888888 : (npc.type === 'fighter' ? 0xff5533 : 0x5588ff);
            const text = npc.disabled
                ? 'WRECK'
                : (npc.type === 'fighter' ? (npc.label || 'FOE').toUpperCase().slice(0, 8) : 'TRADE');
            const textColor = npc.disabled ? '#aaaaaa' : (npc.type === 'fighter' ? '#ff8866' : '#88aaff');
            const edge = this.projectToEdge(npc.getX(), npc.getY());
            this.placeEdgeMarker(edge.x, edge.y, edge.angle, color, npc.type === 'fighter' ? 10 : 8);

            if (!this.shipMarkerLabels[labelIdx]) {
                this.shipMarkerLabels[labelIdx] = this.add.text(0, 0, '', {
                    fontSize: '10px',
                    fill: '#ffffff'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(1801);
            }
            const lbl = this.shipMarkerLabels[labelIdx];
            lbl.setText(text);
            lbl.setColor(textColor);
            lbl.setPosition(edge.x - Math.cos(edge.angle) * 18, edge.y - Math.sin(edge.angle) * 18);
            lbl.setAlpha(0.9);
            labelIdx += 1;
        }

        for (const remote of this.remotePlayers.values()) {
            if (!remote.visibleInSystem) continue;
            if (this.isOnScreen(remote.x, remote.y, 50)) continue;
            const edge = this.projectToEdge(remote.x, remote.y);
            this.placeEdgeMarker(edge.x, edge.y, edge.angle, 0x33ddff, 10);
            if (!this.shipMarkerLabels[labelIdx]) {
                this.shipMarkerLabels[labelIdx] = this.add.text(0, 0, '', {
                    fontSize: '10px',
                    fill: '#ffffff'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(1801);
            }
            const lbl = this.shipMarkerLabels[labelIdx];
            lbl.setText((remote.name || 'PILOT').slice(0, 8).toUpperCase());
            lbl.setColor('#99eeff');
            lbl.setPosition(edge.x - Math.cos(edge.angle) * 18, edge.y - Math.sin(edge.angle) * 18);
            lbl.setAlpha(0.9);
            labelIdx += 1;
        }

        for (let i = labelIdx; i < this.shipMarkerLabels.length; i++) {
            this.shipMarkerLabels[i].setAlpha(0);
        }
        for (const m of this.markerPool) {
            if (!m.activeUse) m.setVisible(false);
        }
    }

    handleNetMessage(raw) {
        let data = raw;
        if (typeof raw === 'string') {
            try {
                data = JSON.parse(raw);
            } catch (_) {
                return;
            }
        }
        if (!data || typeof data !== 'object') return;
        // Ignore our own echoed packets
        if (data.fromId && this.mp?.localId && data.fromId === this.mp.localId) return;

        if (data.type === 'hello' || data.type === 'state') {
            const remote = this.ensureRemotePlayer(data);
            remote.applyState(data);
            if (data.type === 'hello') {
                this.showToast(`${data.name || 'Pilot'} entered the system`, 1800);
                this.retuneFleetEncounters(true);
            }
            return;
        }

        if (data.type === 'fire') {
            this.ensureRemotePlayer(data);
            this.spawnRemoteProjectile(data);
            return;
        }

        if (data.type === 'fleet') {
            // Soft sync: if we're quiet, adopt their wave pressure
            if (data.announce && data.wave > this.fleetWaveIndex) {
                this.fleetWaveIndex = data.wave;
            }
            return;
        }

        if (data.type === 'hyperspace' || data.type === 'system') {
            const remote = this.ensureRemotePlayer(data);
            const systemId = data.systemId || remote.systemId;
            remote.systemId = systemId;
            remote.power = data.power ?? remote.power;
            remote.setInSystem(systemId === this.currentSystemId);
            const name = data.name || remote.name || 'Pilot';
            this.showToast(`${name} → ${getSystem(systemId).name}`, 2200);
            this.retuneFleetEncounters(true);
        }
    }

    ensureRemotePlayer(data = {}) {
        const id = data.fromId || data.id || data.name || 'unknown';
        let remote = this.remotePlayers.get(id);
        if (!remote) {
            // Spread new arrivals around the station so they don't stack
            const angle = Math.random() * Math.PI * 2;
            const dist = 180 + Math.random() * 220;
            const sx = (this.station ? this.station.getX() : this.center) + Math.cos(angle) * dist;
            const sy = (this.station ? this.station.getY() : this.center) + Math.sin(angle) * dist;
            remote = new RemotePlayer(this, {
                id,
                name: data.name || 'Pilot',
                systemId: data.systemId || this.currentSystemId,
                x: data.x ?? sx,
                y: data.y ?? sy,
                rotation: data.rotation || 0,
                shields: data.shields,
                hull: data.hull,
                power: data.power ?? 1
            });
            this.remotePlayers.set(id, remote);
        }
        remote.setInSystem((data.systemId || remote.systemId) === this.currentSystemId);
        return remote;
    }

    sendState(time) {
        if (!this.mp || !this.player) return;
        if (time - this.lastNetSend < 80) return;
        this.lastNetSend = time;
        this.sendNet({
            type: 'state',
            name: this.pilotName,
            x: this.player.getX(),
            y: this.player.getY(),
            rotation: this.player.getRotation(),
            systemId: this.currentSystemId,
            shields: this.player.shields,
            hull: this.player.hull,
            power: powerFromPlayer(this.player)
        });
    }

    triggerGameOver() {
        if (this.gameOver) return;
        this.gameOver = true;
        this.player.body.setVelocity(0, 0);
        this.player.body.setAcceleration(0, 0);
        this.showToast('Ship destroyed. Respawning...', 2000);
        this.time.delayedCall(1600, () => this.respawnPlayer());
    }

    respawnPlayer() {
        this.hideStationUI();
        this.hideHyperspaceMenu();
        this.isDocked = false;
        this.clearAllProjectiles();

        const snapshot = this.player.getSnapshot();
        snapshot.shields = undefined;
        snapshot.hull = undefined;

        this.player.destroy();
        this.player = new Player(this, this.worldSize / 2 - 800, this.worldSize / 2, snapshot);
        this.cameras.main.startFollow(this.player.container, true, 0.08, 0.08);
        this.gameOver = false;
        this.dockButton.setText('DOCK');
        this.showToast('Respawned. Upgrades and cargo retained.');
    }

    update(time, delta) {
        if (!this.player || !this.station) return;

        // Clamp huge frame spikes (tab backgrounded) so physics doesn't hitch
        const safeDelta = Math.min(delta, 50);
        const pad = this.gamepad ? this.gamepad.poll() : null;

        if (!this.gameOver && !this.isDocked && !this.mapOpen && !this.hyperspaceOpen) {
            const aim = this.getNavalAim(pad);
            this.player.update(safeDelta, this.leftJoystick, this.rightJoystick, this.keys, pad, aim);

            // Q/R = battery banks; Space/click = fire off the bow
            if (Phaser.Input.Keyboard.JustDown(this.portKey)) this.fireBroadside('port');
            if (Phaser.Input.Keyboard.JustDown(this.starboardKey)) this.fireBroadside('starboard');

            const autoFire = this.fireKey.isDown || this._pointerFire || (pad && pad.fire);
            if (autoFire) this.fireBroadside('auto');
        } else if (this.aimGfx) {
            this.aimGfx.clear();
            if (this.reticle) this.reticle.setVisible(false);
        }

        const inDockingRange = this.station.update(this.player.getX(), this.player.getY());

        if (!this.isDocked) {
            for (let i = 0; i < this.npcs.length; i++) {
                this.npcs[i].update(time, safeDelta, this.player);
            }
            if (!this.gameOver) {
                this.handleCombat();
                this.updateMines();
            }
            this.maybeRespawnNPCs();
        } else {
            this.processHarvestQueue();
        }

        for (const remote of this.remotePlayers.values()) {
            remote.update(safeDelta);
        }

        // Edge markers every other frame — labels don't need 60Hz
        this._markerFrame = (this._markerFrame || 0) + 1;
        if (this._markerFrame % 2 === 0) this.updateEdgeMarkers();

        this.updateAetherSea(safeDelta);

        this.updateActionButtonVisibility(inDockingRange);
        this.sendState(time);

        if (Phaser.Input.Keyboard.JustDown(this.dockKey) || (pad && this.gamepad.just.dock)) {
            this.attemptDocking();
        }
        if (Phaser.Input.Keyboard.JustDown(this.hyperspaceKey) || (pad && this.gamepad.just.hyperspace)) {
            this.attemptHyperspace();
        }
        if (Phaser.Input.Keyboard.JustDown(this.mapKey) || (pad && this.gamepad.just.map)) {
            this.toggleGalaxyMap();
        }

        if (this.toastText.alpha > 0 && Date.now() > this.statusMessageUntil) {
            this.toastText.setAlpha(0);
        }
        this.hideUpgradePopupIfExpired();

        // Status meters ~20Hz; text HUD ~10Hz (Safari glyph cost)
        if (time - (this.lastStatusDraw || 0) > 50) {
            this.lastStatusDraw = time;
            this.updateStatusVisuals();
        }
        if (time - this.lastHudUpdate > 100) {
            this.lastHudUpdate = time;
            this.updateHUD(inDockingRange, pad);
        }
    }

    updateActionButtonVisibility(inDockingRange) {
        if (inDockingRange || this.isDocked) {
            this.dockButton.setAlpha(1);
        } else {
            this.dockButton.setAlpha(0);
        }

        if (this.isNearHyperspaceEdge() && !this.isDocked && !this.gameOver) {
            this.hyperspaceButton.setAlpha(1);
        } else {
            this.hyperspaceButton.setAlpha(0);
        }
    }

    updateHUD(inDockingRange, pad = null) {
        const p = this.player;
        const u = p.upgrades;
        const foe = this.npcs.find((n) => n.isCombatTarget() && n.type === 'fighter');
        const system = getSystem(this.currentSystemId);
        const fleet = this.online ? this.getFleet() : null;
        const mission = this.defendMode && this.currentSystemId === 'sol'
            ? (this.online
                ? `Sol Online · fleet wave ${this.fleetWaveIndex || 1} · target ${fleet ? targetHostileCount(fleet) : 1} hostiles`
                : (this.defendComplete
                    ? 'Charter: Harbor held — salvage & chart the lanes!'
                    : `Charter: DEFEND THE HARBOR — Wave ${Math.min(this.defendWaveIndex + 1, DEFEND_WAVES.length)}/${DEFEND_WAVES.length}`))
            : (this.activeMission
                ? `Charter: ${this.activeMission.title} ${this.activeMission.type === 'bounty' ? `${this.activeMission.progress || 0}/${this.activeMission.count}` : `→ ${this.activeMission.destName || getSystem(this.activeMission.dest).name}`}`
                : 'Charter: none');
        const pilotsOnline = this.isMultiplayer()
            ? `Sails: ${1 + this.remotePlayers.size}${fleet ? ` · Fleet P${Math.round(fleet.power)} (avg ${fleet.avg.toFixed(1)})` : ''}`
            : '';
        const room = this.isMultiplayer()
            ? `${this.online ? 'Sea' : 'Squadron'}: ${this.roomCode}${this.mode === 'host' ? ' [ANCHOR]' : ''}`
            : '';
        const padStatus = pad?.connected ? 'Pad: Xbox connected' : 'Pad: press any stick/button to connect';
        const weapon = this.player.getWeapon();

        const next = p.getNextUpgradeTarget();
        const yardHint = next
            ? (next.need > 0 ? `Next yard: ${next.label} (−${next.need}c)` : `Next yard: ${next.label} AFFORDABLE`)
            : 'Yard maxed';

        const lines = [
            `build ${BUILD_ID} · shots ${this.projectiles.length}/${MAX_PLAYER_SHOTS} · Power ${powerFromPlayer(p)}`,
            `${system.name}   Purse: ${p.credits}c   Prizes: ${p.kills}`,
            room,
            pilotsOnline,
            padStatus,
            `Battery ${weapon.label} ×${p.getVolleyCount()} · ${p.reloadMs}ms   ${yardHint}`,
            `Hold ${p.getCargoUsed()}/${p.cargoCapacity}   Rig${u.engines} Ward${u.shields} Hull${u.hull} Guns${u.weapons} Hold${u.cargo}`,
            mission,
            foe ? `Sail: ${foe.label || 'corsair'} ${foe.hits}/${foe.maxHits} [${foe.mode}]` : (this.defendComplete ? 'Seas clear' : 'Watching the horizon…'),
            `Sheer: ${this.player.canBoost() ? 'READY [Shift]' : 'recharging…'}`,
            'A/D turn · W/S thrust · mouse aims · Space fire · bow-ram for melee',
            this.isDocked ? 'IN HARBOR [E undock]' : (inDockingRange ? 'Harbor range [E berth]' : (this.isNearHyperspaceEdge() ? 'Beyond the gravity well [H deep lane]' : ''))
        ].filter(Boolean).join('\n');

        if (lines === this.lastHudKey) return;
        this.lastHudKey = lines;
        this.hudText.setText(lines);
    }

    reloadBar(frac) {
        const n = 8;
        const filled = Math.round(frac * n);
        return `${'='.repeat(filled)}${'-'.repeat(n - filled)}`;
    }

    onResize(gameSize) {
        const { width, height } = gameSize;
        const margin = 20;
        const joystickRadius = 50;
        const bottomMargin = 30;

        if (this.leftJoystick) {
            this.leftJoystick.setPosition(margin + joystickRadius, height - bottomMargin - joystickRadius);
            this.leftLabel?.setPosition(margin + joystickRadius, height - bottomMargin - joystickRadius - 70);
        }
        if (this.rightJoystick) {
            this.rightJoystick.setPosition(width - margin - joystickRadius, height - bottomMargin - joystickRadius);
            this.rightLabel?.setPosition(width - margin - joystickRadius, height - bottomMargin - joystickRadius - 70);
        }
        if (this.dockButton) this.dockButton.setPosition(width / 2 - 68, height - 48);
        if (this.hyperspaceButton) this.hyperspaceButton.setPosition(width / 2 + 72, height - 48);
        if (this.fireButton) this.fireButton.setPosition(width / 2, height - 140);
        if (this.fireLabel) this.fireLabel.setPosition(width / 2, height - 140);
        if (this.toastText) this.toastText.setPosition(width / 2, 70);
        if (this.upgradeBannerBg) {
            this.upgradeBannerBg.setPosition(width / 2, height * 0.28);
            this.upgradeBannerTitle?.setPosition(width / 2, height * 0.28 - 16);
            this.upgradeBannerSub?.setPosition(width / 2, height * 0.28 + 18);
        }

        if (this.mapOpen) this.showGalaxyMap();
        if (this.hyperspaceOpen) {
            this.hideHyperspaceMenu();
            this.openHyperspaceMenu();
        }
    }

    shutdown() {
        this.scale.off('resize', this.onResize, this);
        this.hideStationUI();
        this.hideHyperspaceMenu();
        this.hideGalaxyMap();
        this.clearWorldObjects();
        for (const r of this.remotePlayers.values()) r.destroy();
        this.remotePlayers.clear();
    }
}
