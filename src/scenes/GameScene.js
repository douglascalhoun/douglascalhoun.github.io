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

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data = {}) {
        this.mode = data.mode || 'solo';
        this.roomCode = data.roomCode || null;
        this.mp = data.mp || null;
        this.pilotName = data.pilotName || 'Pilot';
    }

    create() {
        ensureGameTextures(this);

        this.worldSize = 10000;
        this.center = this.worldSize / 2;
        this.physics.world.setBounds(0, 0, this.worldSize, this.worldSize);

        this.currentSystemId = 'sol';
        this.activeMission = null;
        this.offeredMission = null;
        this.remotePlayer = null;
        this.lastNetSend = 0;
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

        // Aim reticle (world-space, follows mouse)
        this.reticle = this.add.circle(0, 0, 6, 0x88ffcc, 0).setStrokeStyle(2, 0x88ffcc, 0.85).setDepth(120);
        this.reticle.setVisible(!this.touchEnabled);

        this.scale.on('resize', this.onResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());

        this.setupMultiplayer();
        this.loadSystem('sol');
        this.sendNet({
            type: 'hello',
            name: this.pilotName,
            systemId: this.currentSystemId,
            x: this.player.getX(),
            y: this.player.getY(),
            rotation: this.player.getRotation(),
            shields: this.player.shields,
            hull: this.player.hull
        });

        const room = this.isMultiplayer() ? ` · Room ${this.roomCode}` : '';
        this.showToast(`NAVAL ACTION!${room} · Mouse helm · WASD sail · Q/R broadsides · Space auto-volley`, 6200);
    }

    setupMultiplayer() {
        if (!this.mp) return;

        this.mp.onData = (data) => this.handleNetMessage(data);
        this.mp.onPeer = () => {
            this.showToast('Friend connected.', 2200);
            this.sendNet({
                type: 'hello',
                name: this.pilotName,
                systemId: this.currentSystemId,
                x: this.player.getX(),
                y: this.player.getY(),
                rotation: this.player.getRotation(),
                shields: this.player.shields,
                hull: this.player.hull
            });
        };
        this.mp.onClose = () => {
            this.showToast('Friend disconnected.', 2600);
            if (this.remotePlayer) this.remotePlayer.setInSystem(false);
        };
    }

    isMultiplayer() {
        return this.mode !== 'solo' && this.mp;
    }

    sendNet(data) {
        if (!this.mp) return;
        this.mp.send(data);
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

        // Defend mode in Sol: teach one verb at a time. Other systems keep light traffic.
        if (this.defendMode && system.id === 'sol') {
            this.spawnDefendTraders();
            this.placePlayerNearStation();
            this.startDefendWave(0, 1800);
        } else {
            this.spawnNPCs(system.danger);
            this.placePlayerAtSpawn();
        }

        if (this.remotePlayer) {
            this.remotePlayer.setInSystem(this.remotePlayer.systemId === this.currentSystemId);
        }

        const toast = this.defendMode && system.id === 'sol'
            ? `Entered ${system.name} — DEFEND THE STATION`
            : `Entered ${system.name} — ${system.blurb}`;
        this.showToast(toast, 3200);
        this.sendNet({ type: 'system', systemId: this.currentSystemId, name: this.pilotName });
    }

    clearWorldObjects() {
        this.worldGraphics.forEach((obj) => obj?.destroy());
        this.worldGraphics = [];

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

        const wave = DEFEND_WAVES[this.defendWaveIndex];
        if (!wave || npc.waveId !== wave.id) return;

        // Nintendo-style: when the current pack all "run", introduce the next verb
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
            this.player.grantHarvestReward(reward);
            this.player.credits += Math.floor(npc.bounty * 0.5);
            this.showToast(reward.toast, 3200);

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
        const stars = this.add.graphics();
        stars.setDepth(-100);
        for (let i = 0; i < 90; i++) {
            const x = Phaser.Math.Between(0, worldSize);
            const y = Phaser.Math.Between(0, worldSize);
            const size = Phaser.Math.FloatBetween(0.7, 1.8);
            const alpha = Phaser.Math.FloatBetween(0.35, 0.8);
            stars.fillStyle(i % 9 === 0 ? color : 0xffffff, alpha);
            stars.fillCircle(x, y, size);
        }
        stars.setScrollFactor(0.04);
        this.worldGraphics.push(stars);
        this.starfield = stars;
        return stars;
    }

    createPlanet(x, y, planetDef) {
        const radius = planetDef.radius || 280;
        const color = planetDef.color || 0x3366cc;
        const planet = this.add.graphics();
        planet.fillStyle(color, 0.2);
        planet.fillCircle(x, y, radius + 22);
        planet.fillStyle(color, 1);
        planet.fillCircle(x, y, radius);
        planet.fillStyle(0xffffff, 0.18);
        planet.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.55);
        planet.lineStyle(3, 0xffffff, 0.28);
        planet.strokeCircle(x, y, radius);
        planet.setDepth(-50);
        this.worldGraphics.push(planet);
        this.planet = { x, y, radius, name: planetDef.name, color };
        return planet;
    }

    createSystemBoundary(centerX, centerY, radius, color = 0xff6600) {
        const boundary = this.add.graphics();
        const segments = 72;
        for (let i = 0; i < segments; i++) {
            const startAngle = (i * 2 * Math.PI) / segments;
            const endAngle = startAngle + (Math.PI / segments) * 0.68;
            boundary.lineStyle(2, color, 0.5);
            boundary.beginPath();
            boundary.arc(centerX, centerY, radius, startAngle, endAngle);
            boundary.strokePath();
        }
        boundary.setDepth(-40);
        this.worldGraphics.push(boundary);
        this.boundary = boundary;
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
            'MOVE',
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
        this.hudPanel = this.add.rectangle(12, 12, 460, 230, 0x001408, 0.72)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(1999)
            .setStrokeStyle(1, 0x1a4a28, 0.8);

        this.hudText = this.add.text(22, 20, '', {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '13px',
            fill: '#c8ffd8',
            lineSpacing: 3
        }).setScrollFactor(0).setDepth(2000);

        this.toastText = this.add.text(this.scale.width / 2, 70, '', {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(3100).setAlpha(0);
    }

    createActionButtons() {
        this.dockButton = this.add.text(
            this.scale.width / 2 - 68,
            this.scale.height - 48,
            'DOCK',
            {
                fontSize: '18px',
                fill: '#9dffb0',
                backgroundColor: '#003318',
                padding: { x: 18, y: 10 }
            }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1500).setAlpha(0).setInteractive();

        this.dockButton.on('pointerdown', () => this.attemptDocking());

        this.hyperspaceButton = this.add.text(
            this.scale.width / 2 + 72,
            this.scale.height - 48,
            'HYPER',
            {
                fontSize: '18px',
                fill: '#99eeff',
                backgroundColor: '#06364d',
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

    fireWeapon() {
        // Auto broadside toward mouse / nearest foe
        this.fireBroadside('auto');
    }

    /**
     * @param {'port'|'starboard'|'auto'} side
     */
    fireBroadside(side = 'auto') {
        if (this.gameOver || this.isDocked) return;

        let resolved = side;
        if (side === 'auto') {
            const pointer = this.input.activePointer;
            if (pointer && !this.touchEnabled) {
                const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
                resolved = this.player.preferSideToward(world.x, world.y);
            } else {
                const foe = this.npcs.find((n) => n.isCombatTarget() && n.type === 'fighter');
                if (foe) resolved = this.player.preferSideToward(foe.getX(), foe.getY());
                else resolved = 'starboard';
            }
        }

        if (!this.player.sideReady(resolved)) return;

        const kit = this.player.getWeapon();
        const facing = this.player.getRotation();
        // Port = left of nose (−90°), starboard = right (+90°) in ship-forward space
        const broadsideAngle = resolved === 'port'
            ? facing - Math.PI / 2
            : facing + Math.PI / 2;

        const originX = this.player.getX();
        const originY = this.player.getY();
        const muzzle = kit.muzzle || 28;
        const guns = kit.guns || 3;
        const spread = kit.spread || 0.25;

        // Stagger guns along the hull so the volley reads as a battery
        for (let i = 0; i < guns; i++) {
            const t = guns === 1 ? 0 : (i / (guns - 1)) - 0.5;
            const along = t * 36; // along-ship offset
            const fx = Math.sin(facing);
            const fy = -Math.cos(facing);
            const rx = Math.cos(facing);
            const ry = Math.sin(facing);
            const sideSign = resolved === 'port' ? -1 : 1;
            const sx = originX + fx * along + rx * sideSign * muzzle;
            const sy = originY + fy * along + ry * sideSign * muzzle;
            const shotAngle = broadsideAngle + t * spread;

            const projectile = new Projectile(this, sx, sy, shotAngle, {
                speed: kit.speed,
                color: kit.color,
                radius: kit.radius,
                lifetime: kit.lifetime,
                damage: kit.damage || 1,
                friendly: true,
                blast: kit.blast || 0,
                kind: kit.kind || 'bomb',
                // Use ball texture via kind bomb / custom
            });
            // Prefer cannonball look
            if (this.textures.exists('boltBall')) {
                projectile.setTexture('boltBall');
                projectile.setTint(kit.color);
                projectile.setScale(1.1);
            }
            this.projectiles.push(projectile);
        }

        if (kit.chain) {
            const sideSign = resolved === 'port' ? -1 : 1;
            const rx = Math.cos(facing);
            const ry = Math.sin(facing);
            const chain = new Projectile(
                this,
                originX + rx * sideSign * muzzle,
                originY + ry * sideSign * muzzle,
                broadsideAngle,
                {
                    speed: kit.chain.speed,
                    color: kit.chain.color,
                    radius: kit.chain.radius,
                    lifetime: kit.chain.lifetime,
                    damage: 1,
                    friendly: true,
                    seek: true,
                    kind: 'missile'
                }
            );
            this.projectiles.push(chain);
        }

        this.player.markSideFired(resolved);
        this.spawnBroadsideFlash(resolved, broadsideAngle);

        this.sendNet({
            type: 'fire',
            name: this.pilotName,
            x: originX,
            y: originY,
            rotation: broadsideAngle,
            systemId: this.currentSystemId,
            weaponId: this.player.weaponId,
            side: resolved
        });
    }

    spawnBroadsideFlash(side, angle) {
        const x = this.player.getX();
        const y = this.player.getY();
        const flash = this.add.circle(x, y, 10, 0xffeebb, 0.9).setDepth(115);
        const rx = Math.cos(this.player.getRotation()) * (side === 'port' ? -1 : 1);
        const ry = Math.sin(this.player.getRotation()) * (side === 'port' ? -1 : 1);
        flash.setPosition(x + rx * 30, y + ry * 30);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            scale: 2.4,
            duration: 180,
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
                radius: 4
            }
        );
        this.remoteProjectiles.push(projectile);
    }

    spawnEnemyProjectile(npc, opts = {}) {
        const side = opts.side || 'starboard';
        const guns = opts.count || 3;
        const spread = opts.spread ?? 0.3;
        const facing = npc.getRotation();
        const broadsideAngle = side === 'port' ? facing - Math.PI / 2 : facing + Math.PI / 2;
        const shotSpeed = opts.speed || Math.min(150, 110 + (npc.speed || 80) * 0.25);
        const muzzle = 22;
        const fx = Math.sin(facing);
        const fy = -Math.cos(facing);
        const rx = Math.cos(facing);
        const ry = Math.sin(facing);
        const sideSign = side === 'port' ? -1 : 1;

        for (let i = 0; i < guns; i++) {
            const t = guns === 1 ? 0 : (i / (guns - 1)) - 0.5;
            const along = t * 28;
            const sx = npc.getX() + fx * along + rx * sideSign * muzzle;
            const sy = npc.getY() + fy * along + ry * sideSign * muzzle;
            const projectile = new Projectile(
                this,
                sx,
                sy,
                broadsideAngle + t * spread,
                {
                    speed: shotSpeed,
                    damage: Math.max(4, Math.round((npc.shotDamage || 8) * 0.45)),
                    friendly: false,
                    lifetime: 3200,
                    color: npc.color || 0xff6644,
                    radius: 5,
                    kind: 'bomb'
                }
            );
            if (this.textures.exists('boltBall')) {
                projectile.setTexture('boltBall');
                projectile.setTint(npc.color || 0xff6644);
            }
            this.enemyProjectiles.push(projectile);
        }
    }

    /**
     * Desktop: aim at mouse world position.
     * Touch/pad aim handled inside Player via sticks.
     */
    getMouseAim() {
        if (this.touchEnabled) {
            if (this.reticle) this.reticle.setVisible(false);
            return { hasAim: false, angle: 0 };
        }
        if (this.isDocked || this.mapOpen || this.hyperspaceOpen) {
            if (this.reticle) this.reticle.setVisible(false);
            return { hasAim: false, angle: 0 };
        }

        const pointer = this.input.activePointer;
        if (!pointer || !this.player) {
            return { hasAim: false, angle: 0 };
        }

        const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        if (this.reticle) {
            this.reticle.setVisible(true);
            this.reticle.setPosition(world.x, world.y);
        }

        const dx = world.x - this.player.getX();
        const dy = world.y - this.player.getY();
        if (dx * dx + dy * dy < 16 * 16) return { hasAim: false, angle: 0 };

        return { hasAim: true, angle: Math.atan2(dx, -dy) };
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
        this.showToast(`Docked at ${this.station.getName()} — combat paused`);
    }

    undock() {
        this.isDocked = false;
        this.hideStationUI();
        this.dockButton.setText('DOCK');
        this.showToast('Undocked. Safe travels.');
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

        const overlay = this.add.rectangle(cx, cy, panelW, panelH, 0x06140c, 0.96)
            .setStrokeStyle(2, 0x33aa66)
            .setScrollFactor(0)
            .setDepth(2500);

        const title = this.add.text(cx, cy - panelH / 2 + 24, this.station.getName(), {
            fontSize: '20px',
            fill: '#9dffb0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        const tabY = cy - panelH / 2 + 60;
        const tradeTab = this.makeStationButton(cx - 140, tabY, 'Trade', () => {
            this.stationTab = 'trade';
            this.rebuildStationBody();
        });
        const upgradeTab = this.makeStationButton(cx, tabY, 'Upgrades', () => {
            this.stationTab = 'upgrades';
            this.rebuildStationBody();
        });
        const missionTab = this.makeStationButton(cx + 140, tabY, 'Missions', () => {
            this.stationTab = 'missions';
            this.rebuildStationBody();
        });

        this.stationStatus = this.add.text(cx, cy - panelH / 2 + 100, '', {
            fontSize: '12px',
            fill: '#d8ffe8',
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
                { key: 'food', label: 'Food' },
                { key: 'ore', label: 'Ore' },
                { key: 'tech', label: 'Tech' }
            ];
            goods.forEach((good, index) => {
                const y = cy - 24 + index * 52;
                buttons.push(this.makeStationButton(cx - 105, y, `Buy ${good.label}`, () => this.buyGood(good.key)));
                buttons.push(this.makeStationButton(cx + 105, y, `Sell ${good.label}`, () => this.sellGood(good.key)));
            });
            buttons.push(this.makeStationButton(cx, cy + panelH / 2 - 48, 'Repair Ship', () => {
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
        this.showToast(result.message);
        this.rebuildStationBody();
    }

    makeStationButton(x, y, label, onClick) {
        const btn = this.add.text(x, y, label, {
            fontSize: '14px',
            fill: '#ffffff',
            backgroundColor: '#1a4d33',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2502).setInteractive({ useHandCursor: true });

        btn.on('pointerdown', onClick);
        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#2a6d4a' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#1a4d33' }));
        return btn;
    }

    refreshStationStatus() {
        if (!this.stationStatus) return;
        const p = this.player;
        const prices = this.station.prices;
        const u = p.upgrades;

        if (this.stationTab === 'upgrades') {
            this.stationStatus.setText([
                `Credits: ${p.credits}   Kills: ${p.kills}`,
                `E${u.engines} S${u.shields} H${u.hull} W${u.weapons} C${u.cargo}`,
                `Rate ${p.fireRate}ms  Cap ${p.cargoCapacity}  MaxSpd ${Math.round(p.body.maxVelocityX)}`
            ].join('\n'));
            return;
        }

        if (this.stationTab === 'missions') {
            const mission = this.activeMission || this.offeredMission;
            this.stationStatus.setText(mission
                ? this.formatMission(mission)
                : 'No mission data available.'
            );
            return;
        }

        this.stationStatus.setText([
            `Credits: ${p.credits}`,
            `Cargo: ${p.getCargoUsed()}/${p.cargoCapacity}  (F:${p.cargo.food} O:${p.cargo.ore} T:${p.cargo.tech})`,
            `Hull ${Math.round(p.hull)}/${p.maxHull}  Shields ${Math.round(p.shields)}/${p.maxShields}`,
            `Prices  Food ${prices.food.buy}/${prices.food.sell}  Ore ${prices.ore.buy}/${prices.ore.sell}  Tech ${prices.tech.buy}/${prices.tech.sell}`
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
        return dist > this.worldSize * 0.45 * 0.92;
    }

    attemptHyperspace() {
        if (this.gameOver || this.isDocked) return;
        if (!this.isNearHyperspaceEdge()) {
            this.showToast('Reach the orange system edge to enter hyperspace.', 2200);
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
            this.showToast('No hyperspace lanes from here.', 2200);
            return;
        }

        this.hyperspaceOpen = true;
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const panelW = Math.min(420, this.scale.width * 0.9);
        const panelH = 150 + destinations.length * 46;
        const overlay = this.add.rectangle(cx, cy, panelW, panelH, 0x03131f, 0.96)
            .setStrokeStyle(2, 0x33ddff)
            .setScrollFactor(0)
            .setDepth(2700);
        const title = this.add.text(cx, cy - panelH / 2 + 28, 'HYPERSPACE LANES', {
            fontSize: '18px',
            fill: '#99eeff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2701);
        const hint = this.add.text(cx, cy - panelH / 2 + 56, getSystem(this.currentSystemId).name, {
            fontSize: '12px',
            fill: '#c8f8ff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2701);

        const items = [overlay, title, hint];
        destinations.forEach((dest, index) => {
            const btn = this.makeOverlayButton(cx, cy - panelH / 2 + 98 + index * 46, `${dest.name}  (${dest.blurb})`, () => this.jumpTo(dest.id), 2702);
            items.push(btn);
        });
        items.push(this.makeOverlayButton(cx, cy + panelH / 2 - 28, 'Cancel', () => this.hideHyperspaceMenu(), 2702));

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
            this.showToast('No direct hyperspace lane.', 2000);
            return;
        }

        this.hideHyperspaceMenu();
        this.hideGalaxyMap();
        this.showToast(`Entering hyperspace to ${getSystem(systemId).name}...`, 1200);
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

        const overlay = this.add.rectangle(cx, cy, panelW, panelH, 0x020711, 0.97)
            .setStrokeStyle(2, 0x6688ff)
            .setScrollFactor(0)
            .setDepth(2800);
        items.push(overlay);

        const title = this.add.text(cx, cy - panelH / 2 + 28, 'GALAXY MAP', {
            fontSize: '20px',
            fill: '#ccd8ff'
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
                graph.lineStyle(2, 0x4466aa, 0.65);
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
        items.push(this.add.text(cx, cy + panelH / 2 - 76, `Current: ${getSystem(this.currentSystemId).name}`, {
            fontSize: '14px',
            fill: '#ffdd66'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2802));
        items.push(this.add.text(cx, cy + panelH / 2 - 50, `Linked: ${links || 'none'}`, {
            fontSize: '12px',
            fill: '#c8d8ff',
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
            fill: '#ffffff',
            backgroundColor: '#163454',
            padding: { x: 12, y: 8 },
            align: 'center',
            wordWrap: { width: Math.min(460, this.scale.width * 0.78) }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(depth).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#24527c' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#163454' }));
        btn.on('pointerdown', onClick);
        return btn;
    }

    handleCombat() {
        const seekTarget = this.npcs.find((n) => n.isCombatTarget() && n.type === 'fighter') || null;

        this.projectiles = this.projectiles.filter((proj) => {
            if (!proj.update(undefined, undefined, seekTarget)) return false;

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

            proj.destroy();
            return false;
        });

        this.enemyProjectiles = this.enemyProjectiles.filter((proj) => {
            if (!proj.update()) return false;
            const dist = Phaser.Math.Distance.Between(
                proj.getX(), proj.getY(),
                this.player.getX(), this.player.getY()
            );
            if (dist < 26) {
                const dead = this.player.takeDamage(proj.damage);
                proj.destroy();
                this.cameras.main.shake(70, 0.0035);
                if (dead) this.triggerGameOver();
                return false;
            }
            return true;
        });

        this.remoteProjectiles = this.remoteProjectiles.filter((proj) => proj.update());
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
                const idx = this.pendingWaveSpawn.index;
                this.pendingWaveSpawn = null;
                this.spawnDefendWave(idx);
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
        this.showToast(`Tier ${tier} fighter engaging!`, 2200);
    }

    createEdgeMarkers() {
        this.markerLabels = {
            planet: this.add.text(0, 0, 'PLANET', { fontSize: '10px', fill: '#88bbff' })
                .setOrigin(0.5).setScrollFactor(0).setDepth(1801).setAlpha(0),
            station: this.add.text(0, 0, 'STATION', { fontSize: '10px', fill: '#9dffb0' })
                .setOrigin(0.5).setScrollFactor(0).setDepth(1801).setAlpha(0)
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

        if (this.remotePlayer && this.remotePlayer.visibleInSystem
            && !this.isOnScreen(this.remotePlayer.x, this.remotePlayer.y, 50)) {
            const edge = this.projectToEdge(this.remotePlayer.x, this.remotePlayer.y);
            this.placeEdgeMarker(edge.x, edge.y, edge.angle, 0x33ddff, 10);
            if (!this.shipMarkerLabels[labelIdx]) {
                this.shipMarkerLabels[labelIdx] = this.add.text(0, 0, '', {
                    fontSize: '10px',
                    fill: '#ffffff'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(1801);
            }
            const lbl = this.shipMarkerLabels[labelIdx];
            lbl.setText('FRIEND');
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

        if (data.type === 'hello' || data.type === 'state') {
            this.ensureRemotePlayer(data);
            this.remotePlayer.applyState({
                name: data.name,
                x: data.x ?? this.remotePlayer.x,
                y: data.y ?? this.remotePlayer.y,
                rotation: data.rotation ?? this.remotePlayer.rotation,
                systemId: data.systemId || this.remotePlayer.systemId,
                shields: data.shields,
                hull: data.hull
            });
            return;
        }

        if (data.type === 'fire') {
            this.ensureRemotePlayer(data);
            this.spawnRemoteProjectile(data);
            return;
        }

        if (data.type === 'hyperspace' || data.type === 'system') {
            this.ensureRemotePlayer(data);
            const systemId = data.systemId || this.remotePlayer.systemId;
            this.remotePlayer.systemId = systemId;
            this.remotePlayer.setInSystem(systemId === this.currentSystemId);
            const name = data.name || this.remotePlayer.name || 'Friend';
            this.showToast(`${name} jumped to ${getSystem(systemId).name}`, 2200);
        }
    }

    ensureRemotePlayer(data = {}) {
        if (this.remotePlayer) return;
        this.remotePlayer = new RemotePlayer(this, {
            name: data.name || 'Friend',
            systemId: data.systemId || this.currentSystemId,
            x: data.x ?? this.center + 100,
            y: data.y ?? this.center,
            rotation: data.rotation || 0,
            shields: data.shields,
            hull: data.hull
        });
        this.remotePlayer.setInSystem(this.remotePlayer.systemId === this.currentSystemId);
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
            hull: this.player.hull
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
            const aim = this.getMouseAim();
            this.player.update(safeDelta, this.leftJoystick, this.rightJoystick, this.keys, pad, aim);

            if (Phaser.Input.Keyboard.JustDown(this.portKey)) this.fireBroadside('port');
            if (Phaser.Input.Keyboard.JustDown(this.starboardKey)) this.fireBroadside('starboard');

            const autoFire = this.fireKey.isDown || this._pointerFire || (pad && pad.fire);
            if (autoFire) this.fireBroadside('auto');
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

        if (this.remotePlayer) this.remotePlayer.update(safeDelta);

        // Edge markers every other frame — labels don't need 60Hz
        this._markerFrame = (this._markerFrame || 0) + 1;
        if (this._markerFrame % 2 === 0) this.updateEdgeMarkers();

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

        // HUD text at ~10Hz — setText every frame recreates canvas glyphs on Safari
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
        const mission = this.defendMode && this.currentSystemId === 'sol'
            ? (this.defendComplete
                ? 'Mission: Station defended — salvage & explore!'
                : `Mission: DEFEND THE STATION — Wave ${Math.min(this.defendWaveIndex + 1, DEFEND_WAVES.length)}/${DEFEND_WAVES.length}`)
            : (this.activeMission
                ? `Mission: ${this.activeMission.title} ${this.activeMission.type === 'bounty' ? `${this.activeMission.progress || 0}/${this.activeMission.count}` : `→ ${this.activeMission.destName || getSystem(this.activeMission.dest).name}`}`
                : 'Mission: none');
        const friend = this.remotePlayer
            ? `Friend: ${this.remotePlayer.name} @ ${getSystem(this.remotePlayer.systemId).name}`
            : (this.isMultiplayer() ? 'Friend: waiting...' : '');
        const room = this.isMultiplayer() ? `Room: ${this.roomCode}` : '';
        const padStatus = pad?.connected ? 'Pad: Xbox connected' : 'Pad: press any stick/button to connect';
        const weapon = this.player.getWeapon();

        const lines = [
            `${system.name}   Credits: ${p.credits}   Kills: ${p.kills}`,
            room,
            friend,
            padStatus,
            `Shields: ${Math.round(p.shields)} / ${p.maxShields}`,
            `Hull: ${Math.round(p.hull)} / ${p.maxHull}`,
            `Battery: ${weapon.label}   Reload ${p.reloadMs}ms`,
            `PORT [${this.reloadBar(p.sideReloadFrac('port'))}]  STARBOARD [${this.reloadBar(p.sideReloadFrac('starboard'))}]`,
            `Cargo ${p.getCargoUsed()}/${p.cargoCapacity}   Crew/Upgrades E${u.engines} S${u.shields} H${u.hull} G${u.weapons} C${u.cargo}`,
            mission,
            foe ? `Foe: ${foe.label || foe.type} ${foe.hits}/${foe.maxHits} [${foe.mode}]` : (this.defendComplete ? 'Sky clear' : 'Awaiting hostiles...'),
            `Jink: ${this.player.canBoost() ? 'READY [Shift]' : 'recharging…'}`,
            'Mouse helm · WASD sail · Q port / R starboard · Space auto-volley · E dock',
            this.isDocked ? 'DOCKED [E / X undock]' : (inDockingRange ? 'In docking range [E / X]' : (this.isNearHyperspaceEdge() ? 'Hyperspace edge [H / Y]' : ''))
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
        this.remotePlayer?.destroy();
        this.remotePlayer = null;
    }
}
