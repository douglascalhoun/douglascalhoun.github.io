import Phaser from 'phaser';
import Player from '../entities/Player.js';
import Station from '../entities/Station.js';
import NPCShip from '../entities/NPCShip.js';
import Projectile from '../entities/Projectile.js';
import VirtualJoystick from '../utils/VirtualJoystick.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const worldSize = 10000;
        this.worldSize = worldSize;
        this.physics.world.setBounds(0, 0, worldSize, worldSize);

        this.createStarField(worldSize);
        this.createPlanet(worldSize / 2, worldSize / 2, 300);
        this.createSystemBoundary(worldSize / 2, worldSize / 2, worldSize * 0.45);

        this.station = new Station(this, worldSize / 2 + 600, worldSize / 2 - 400, 'Outpost Alpha');

        this.npcs = [];
        this.spawnNPCs();

        this.player = new Player(this, worldSize / 2 - 800, worldSize / 2);
        this.cameras.main.startFollow(this.player.container, true, 0.12, 0.12);
        this.cameras.main.setBounds(0, 0, worldSize, worldSize);
        this.cameras.main.setZoom(1);

        this.projectiles = [];
        this.enemyProjectiles = [];
        this.lastFireTime = 0;
        this.fireRate = 180;
        this.isDocked = false;
        this.dockingUI = null;
        this.gameOver = false;
        this.statusMessage = '';
        this.statusMessageUntil = 0;
        this.enemyTier = 1;
        this.pendingSpawn = null;
        this.edgeMarkers = [];

        this.setupTouchControls();
        this.createHUD();
        this.createDockButton();
        this.createEdgeMarkers();

        this.keys = this.input.keyboard.addKeys('W,A,S,D,J,K,E,SPACE');
        this.dockKey = this.keys.E;
        this.fireKey = this.keys.SPACE;

        this.scale.on('resize', this.onResize, this);
        this.showToast('WASD turn/thrust · J/K strafe · Space fire · E dock');
    }

    spawnNPCs() {
        const c = this.worldSize / 2;
        this.npcs.push(new NPCShip(this, c + 300, c + 500, 'trader'));
        this.npcs.push(new NPCShip(this, c - 500, c + 300, 'trader'));
        // One starter fighter to duel
        this.npcs.push(new NPCShip(this, c + 800, c - 600, 'fighter', { tier: 1 }));
    }

    createStarField(worldSize) {
        const stars = this.add.graphics();
        stars.setDepth(-100);
        for (let i = 0; i < 140; i++) {
            const x = Phaser.Math.Between(0, worldSize);
            const y = Phaser.Math.Between(0, worldSize);
            const size = Phaser.Math.FloatBetween(0.7, 1.6);
            const alpha = Phaser.Math.FloatBetween(0.35, 0.75);
            stars.fillStyle(0xffffff, alpha);
            stars.fillCircle(x, y, size);
        }
        stars.setScrollFactor(0.04);
    }

    createPlanet(x, y, radius) {
        const planet = this.add.graphics();
        planet.fillStyle(0x4488ff, 0.2);
        planet.fillCircle(x, y, radius + 20);
        planet.fillStyle(0x3366cc, 1);
        planet.fillCircle(x, y, radius);
        planet.fillStyle(0x5599ff, 0.4);
        planet.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.6);
        planet.lineStyle(3, 0x88bbff, 0.3);
        planet.strokeCircle(x, y, radius);
        planet.setDepth(-50);
        this.planet = { x, y, radius };
    }

    createSystemBoundary(centerX, centerY, radius) {
        const boundary = this.add.graphics();
        const segments = 60;
        for (let i = 0; i < segments; i++) {
            const startAngle = (i * 2 * Math.PI) / segments;
            const endAngle = startAngle + Math.PI / segments * 0.6;
            boundary.lineStyle(2, 0xff6600, 0.5);
            boundary.beginPath();
            boundary.arc(centerX, centerY, radius, startAngle, endAngle);
            boundary.strokePath();
        }
        boundary.setDepth(-40);
    }

    setupTouchControls() {
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
            'TURN',
            { fontSize: '12px', fill: '#777' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

        this.rightLabel = this.add.text(
            this.scale.width - margin - joystickRadius,
            this.scale.height - bottomMargin - joystickRadius - 70,
            'THRUST',
            { fontSize: '12px', fill: '#777' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    }

    createHUD() {
        this.hudText = this.add.text(12, 12, '', {
            fontSize: '14px',
            fill: '#c8ffd8',
            backgroundColor: '#001408aa',
            padding: { x: 10, y: 8 },
            lineSpacing: 4
        }).setScrollFactor(0).setDepth(2000);

        this.toastText = this.add.text(this.scale.width / 2, 70, '', {
            fontSize: '16px',
            fill: '#ffffff',
            backgroundColor: '#000000aa',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2100).setAlpha(0);
    }

    createDockButton() {
        this.dockButton = this.add.text(
            this.scale.width / 2,
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
            'FIRE',
            { fontSize: '12px', fill: '#ffffff' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(1501);
    }

    showToast(message, duration = 2800) {
        this.statusMessage = message;
        this.statusMessageUntil = Date.now() + duration;
        this.toastText.setText(message);
        this.toastText.setAlpha(1);
    }

    fireWeapon() {
        if (this.gameOver || this.isDocked) return;
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate) return;
        this.lastFireTime = now;

        const projectile = new Projectile(
            this,
            this.player.getX(),
            this.player.getY(),
            this.player.getRotation(),
            520,
            { damage: 1, fromPlayer: true, lifetime: 1500 }
        );
        this.projectiles.push(projectile);
    }

    spawnEnemyProjectile(npc) {
        const projectile = new Projectile(
            this,
            npc.getX(),
            npc.getY(),
            npc.getRotation(),
            360 + npc.tier * 15,
            { damage: npc.shotDamage, fromPlayer: false, lifetime: 1500 }
        );
        this.enemyProjectiles.push(projectile);
    }

    attemptDocking() {
        if (this.gameOver) return;
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
        this.showStationUI();
        this.dockButton.setText('UNDOCK');
        this.dockButton.setAlpha(1);
        this.showToast(`Docked at ${this.station.getName()}`);
    }

    undock() {
        this.isDocked = false;
        this.hideStationUI();
        this.dockButton.setText('DOCK');
        this.showToast('Undocked. Safe travels.');
    }

    showStationUI() {
        if (this.dockingUI) return;
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        const overlay = this.add.rectangle(cx, cy, Math.min(420, this.scale.width * 0.9), Math.min(460, this.scale.height * 0.78), 0x06140c, 0.96)
            .setStrokeStyle(2, 0x33aa66)
            .setScrollFactor(0)
            .setDepth(2500);

        const title = this.add.text(cx, cy - overlay.height / 2 + 28, this.station.getName(), {
            fontSize: '22px',
            fill: '#9dffb0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        const subtitle = this.add.text(cx, cy - overlay.height / 2 + 58, 'Trade & Repair', {
            fontSize: '14px',
            fill: '#88aa99'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        this.stationStatus = this.add.text(cx, cy - overlay.height / 2 + 90, '', {
            fontSize: '13px',
            fill: '#d8ffe8',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        const buttons = [];
        const goods = [
            { key: 'food', label: 'Food' },
            { key: 'ore', label: 'Ore' },
            { key: 'tech', label: 'Tech' }
        ];

        goods.forEach((good, index) => {
            const y = cy - 40 + index * 58;
            const buy = this.makeStationButton(cx - 90, y, `Buy ${good.label}`, () => this.buyGood(good.key));
            const sell = this.makeStationButton(cx + 90, y, `Sell ${good.label}`, () => this.sellGood(good.key));
            buttons.push(buy, sell);
        });

        const repairBtn = this.makeStationButton(cx, cy + 150, 'Repair Ship', () => {
            const result = this.player.repair(2);
            this.showToast(result.message);
            this.refreshStationStatus();
        });
        buttons.push(repairBtn);

        this.dockingUI = { overlay, title, subtitle, buttons, status: this.stationStatus };
        this.refreshStationStatus();
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
        this.stationStatus.setText([
            `Credits: ${p.credits}`,
            `Cargo: ${p.getCargoUsed()}/${p.cargoCapacity}  (F:${p.cargo.food} O:${p.cargo.ore} T:${p.cargo.tech})`,
            `Hull ${Math.round(p.hull)} / Shields ${Math.round(p.shields)}`,
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
        this.dockingUI.subtitle.destroy();
        this.dockingUI.status.destroy();
        this.dockingUI.buttons.forEach((b) => b.destroy());
        this.dockingUI = null;
        this.stationStatus = null;
    }

    handleCombat() {
        this.projectiles = this.projectiles.filter((proj) => {
            if (!proj.update()) return false;
            for (const npc of this.npcs) {
                if (!npc.isCombatTarget()) continue;
                const dist = Phaser.Math.Distance.Between(proj.getX(), proj.getY(), npc.getX(), npc.getY());
                if (dist < 26) {
                    const result = npc.takeDamage(1);
                    proj.destroy();
                    if (result === 'disabled') {
                        this.player.credits += npc.bounty;
                        this.showToast(`${npc.type} disabled! +${npc.bounty}c`, 2200);
                        this.spawnExplosion(npc.getX(), npc.getY());
                        if (npc.type === 'fighter') {
                            this.queueTougherFighter(npc.tier);
                        }
                    } else if (result === 'critical') {
                        this.showToast('Enemy critical — they\'re running!', 1600);
                    }
                    return false;
                }
            }
            return true;
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
        // Keep a couple traders around
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

        // Spawn next tougher fighter after defeat delay
        if (this.pendingSpawn && Date.now() >= this.pendingSpawn.at) {
            const activeFighters = this.npcs.filter((n) => n.isCombatTarget() && n.type === 'fighter');
            if (activeFighters.length === 0) {
                this.spawnFighterNearPlayer(this.pendingSpawn.tier);
            }
            this.pendingSpawn = null;
        }

        // Clean long-dead wrecks eventually (keep briefly as disabled hulks)
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
        this.markerLayer = this.add.graphics().setScrollFactor(0).setDepth(1800);
    }

    isOnScreen(worldX, worldY, pad = 40) {
        const cam = this.cameras.main;
        return (
            worldX > cam.worldView.x - pad &&
            worldX < cam.worldView.x + cam.worldView.width + pad &&
            worldY > cam.worldView.y - pad &&
            worldY < cam.worldView.y + cam.worldView.height + pad
        );
    }

    projectToEdge(worldX, worldY) {
        const cam = this.cameras.main;
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const sx = (worldX - cam.worldView.x) / cam.zoom;
        const sy = (worldY - cam.worldView.y) / cam.zoom;
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

    drawEdgeMarker(g, x, y, angle, color, size = 10, label = null) {
        const tipX = x + Math.cos(angle) * size;
        const tipY = y + Math.sin(angle) * size;
        const leftX = x + Math.cos(angle + 2.5) * size * 0.7;
        const leftY = y + Math.sin(angle + 2.5) * size * 0.7;
        const rightX = x + Math.cos(angle - 2.5) * size * 0.7;
        const rightY = y + Math.sin(angle - 2.5) * size * 0.7;

        g.fillStyle(color, 0.95);
        g.fillTriangle(tipX, tipY, leftX, leftY, rightX, rightY);
        g.lineStyle(1, 0xffffff, 0.35);
        g.strokeTriangle(tipX, tipY, leftX, leftY, rightX, rightY);

        if (label) {
            // Labels handled separately via text pool for clarity
        }
    }

    updateEdgeMarkers() {
        const g = this.markerLayer;
        g.clear();

        if (!this.markerLabels) {
            this.markerLabels = {
                planet: this.add.text(0, 0, 'PLANET', { fontSize: '10px', fill: '#88bbff' }).setOrigin(0.5).setScrollFactor(0).setDepth(1801).setAlpha(0),
                station: this.add.text(0, 0, 'STATION', { fontSize: '10px', fill: '#9dffb0' }).setOrigin(0.5).setScrollFactor(0).setDepth(1801).setAlpha(0)
            };
            this.shipMarkerLabels = [];
        }

        const targets = [
            { x: this.planet.x, y: this.planet.y, color: 0x66aaff, size: 12, key: 'planet' },
            { x: this.station.getX(), y: this.station.getY(), color: 0x44ff88, size: 11, key: 'station' }
        ];

        for (const t of targets) {
            const label = this.markerLabels[t.key];
            if (this.isOnScreen(t.x, t.y, 60)) {
                label.setAlpha(0);
                continue;
            }
            const edge = this.projectToEdge(t.x, t.y);
            this.drawEdgeMarker(g, edge.x, edge.y, edge.angle, t.color, t.size);
            label.setPosition(edge.x - Math.cos(edge.angle) * 18, edge.y - Math.sin(edge.angle) * 18);
            label.setAlpha(0.9);
        }

        // Ship markers
        let labelIdx = 0;
        for (const npc of this.npcs) {
            if (!npc.alive) continue;
            if (this.isOnScreen(npc.getX(), npc.getY(), 50)) continue;

            const color = npc.disabled ? 0x888888 : (npc.type === 'fighter' ? 0xff5533 : 0x5588ff);
            const edge = this.projectToEdge(npc.getX(), npc.getY());
            this.drawEdgeMarker(g, edge.x, edge.y, edge.angle, color, npc.type === 'fighter' ? 10 : 8);

            if (!this.shipMarkerLabels[labelIdx]) {
                this.shipMarkerLabels[labelIdx] = this.add.text(0, 0, '', {
                    fontSize: '9px',
                    fill: '#ffaa88'
                }).setOrigin(0.5).setScrollFactor(0).setDepth(1801);
            }
            const lbl = this.shipMarkerLabels[labelIdx];
            const text = npc.disabled
                ? 'WRECK'
                : (npc.type === 'fighter' ? `FOE T${npc.tier}` : 'TRADE');
            lbl.setText(text);
            lbl.setColor(npc.disabled ? '#aaaaaa' : (npc.type === 'fighter' ? '#ff8866' : '#88aaff'));
            lbl.setPosition(edge.x - Math.cos(edge.angle) * 16, edge.y - Math.sin(edge.angle) * 16);
            lbl.setAlpha(0.9);
            labelIdx += 1;
        }

        for (let i = labelIdx; i < this.shipMarkerLabels.length; i++) {
            this.shipMarkerLabels[i].setAlpha(0);
        }
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
        this.isDocked = false;
        this.projectiles.forEach((p) => p.destroy());
        this.enemyProjectiles.forEach((p) => p.destroy());
        this.projectiles = [];
        this.enemyProjectiles = [];

        const savedCredits = this.player.credits;
        const savedCargo = { ...this.player.cargo };

        this.player.destroy();
        this.player = new Player(this, this.worldSize / 2 - 800, this.worldSize / 2);
        this.player.credits = savedCredits;
        this.player.cargo = savedCargo;
        this.cameras.main.startFollow(this.player.container, true, 0.12, 0.12);
        this.gameOver = false;
        this.dockButton.setText('DOCK');
        this.showToast('Respawned. Credits and cargo retained.');
    }

    update(time, delta) {
        if (!this.player) return;

        if (!this.gameOver && !this.isDocked) {
            this.player.update(delta, this.leftJoystick, this.rightJoystick, this.keys);
            if (this.fireKey.isDown) this.fireWeapon();
        }

        const inDockingRange = this.station.update(this.player.getX(), this.player.getY());
        this.npcs.forEach((npc) => npc.update(time, delta, this.player));

        if (!this.gameOver) this.handleCombat();
        this.maybeRespawnNPCs();
        this.updateEdgeMarkers();

        if (inDockingRange && !this.isDocked) {
            this.dockButton.setAlpha(1);
        } else if (!this.isDocked) {
            this.dockButton.setAlpha(0);
        }

        if (Phaser.Input.Keyboard.JustDown(this.dockKey)) {
            this.attemptDocking();
        }

        if (this.toastText.alpha > 0 && Date.now() > this.statusMessageUntil) {
            this.toastText.setAlpha(0);
        }

        const p = this.player;
        const foe = this.npcs.find((n) => n.isCombatTarget() && n.type === 'fighter');
        this.hudText.setText([
            `Credits: ${p.credits}`,
            `Shields: ${Math.round(p.shields)} / ${p.maxShields}`,
            `Hull: ${Math.round(p.hull)} / ${p.maxHull}`,
            `Speed: ${Math.round(p.getSpeed())}`,
            foe ? `Foe T${foe.tier}: ${foe.hits}/${foe.maxHits} hits [${foe.mode}]` : `Next foe tier: ${this.enemyTier}`,
            'A/D turn · W/S thrust · J/K strafe · Space fire',
            this.isDocked ? 'DOCKED [E undock]' : (inDockingRange ? 'In docking range [E]' : '')
        ].filter(Boolean).join('\n'));
    }

    onResize(gameSize) {
        const { width, height } = gameSize;
        const margin = 20;
        const joystickRadius = 50;
        const bottomMargin = 30;

        if (this.leftJoystick) {
            this.leftJoystick.setPosition(margin + joystickRadius, height - bottomMargin - joystickRadius);
            this.leftLabel.setPosition(margin + joystickRadius, height - bottomMargin - joystickRadius - 70);
        }
        if (this.rightJoystick) {
            this.rightJoystick.setPosition(width - margin - joystickRadius, height - bottomMargin - joystickRadius);
            this.rightLabel.setPosition(width - margin - joystickRadius, height - bottomMargin - joystickRadius - 70);
        }
        if (this.dockButton) this.dockButton.setPosition(width / 2, height - 48);
        if (this.fireButton) this.fireButton.setPosition(width / 2, height - 140);
        if (this.fireLabel) this.fireLabel.setPosition(width / 2, height - 140);
        if (this.toastText) this.toastText.setPosition(width / 2, 70);
    }
}
