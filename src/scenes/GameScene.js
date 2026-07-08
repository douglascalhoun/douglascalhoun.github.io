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
        this.isDocked = false;
        this.dockingUI = null;
        this.stationTab = 'trade';
        this.gameOver = false;
        this.statusMessage = '';
        this.statusMessageUntil = 0;

        this.setupTouchControls();
        this.createHUD();
        this.createDockButton();
        this.setupKeyboard();

        this.scale.on('resize', this.onResize, this);
        this.showToast('Phase 4: dock to upgrade your ship.');
    }

    setupKeyboard() {
        this.dockKey = null;
        this.fireKey = null;
        if (!this.input.keyboard) return;
        this.dockKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    spawnNPCs() {
        const c = this.worldSize / 2;
        this.npcs.push(new NPCShip(this, c + 300, c + 500, 'trader'));
        this.npcs.push(new NPCShip(this, c - 500, c + 300, 'trader'));
        this.npcs.push(new NPCShip(this, c + 800, c - 600, 'fighter'));
        this.npcs.push(new NPCShip(this, c - 900, c - 200, 'fighter'));
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
        if (now - this.lastFireTime < this.player.fireRate) return;
        this.lastFireTime = now;

        const projectile = new Projectile(
            this,
            this.player.getX(),
            this.player.getY(),
            this.player.getRotation(),
            560,
            { damage: this.player.weaponDamage, fromPlayer: true }
        );
        this.projectiles.push(projectile);
    }

    spawnEnemyProjectile(npc) {
        const projectile = new Projectile(
            this,
            npc.getX(),
            npc.getY(),
            npc.getRotation(),
            420,
            { damage: 10, fromPlayer: false, lifetime: 1600 }
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
        this.stationTab = 'trade';
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;
        const panelW = Math.min(440, this.scale.width * 0.92);
        const panelH = Math.min(520, this.scale.height * 0.82);

        const overlay = this.add.rectangle(cx, cy, panelW, panelH, 0x06140c, 0.96)
            .setStrokeStyle(2, 0x33aa66)
            .setScrollFactor(0)
            .setDepth(2500);

        const title = this.add.text(cx, cy - panelH / 2 + 24, this.station.getName(), {
            fontSize: '20px',
            fill: '#9dffb0'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        const tradeTab = this.makeStationButton(cx - 80, cy - panelH / 2 + 58, 'Trade', () => {
            this.stationTab = 'trade';
            this.rebuildStationBody();
        });
        const upgradeTab = this.makeStationButton(cx + 80, cy - panelH / 2 + 58, 'Upgrades', () => {
            this.stationTab = 'upgrades';
            this.rebuildStationBody();
        });

        this.stationStatus = this.add.text(cx, cy - panelH / 2 + 92, '', {
            fontSize: '12px',
            fill: '#d8ffe8',
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(2501);

        this.dockingUI = {
            overlay,
            title,
            tabs: [tradeTab, upgradeTab],
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
                const y = cy - 30 + index * 52;
                buttons.push(this.makeStationButton(cx - 95, y, `Buy ${good.label}`, () => this.buyGood(good.key)));
                buttons.push(this.makeStationButton(cx + 95, y, `Sell ${good.label}`, () => this.sellGood(good.key)));
            });
            buttons.push(this.makeStationButton(cx, cy + panelH / 2 - 48, 'Repair Ship', () => {
                const result = this.player.repair(2);
                this.showToast(result.message);
                this.refreshStationStatus();
            }));
        } else {
            const defs = Player.getUpgradeDefs();
            Object.keys(defs).forEach((key, index) => {
                const def = defs[key];
                const level = this.player.getUpgradeLevel(key);
                const cost = this.player.getUpgradeCost(key);
                const y = cy - 50 + index * 48;
                const label = cost === null
                    ? `${def.label} Lv${level} MAX`
                    : `${def.label} Lv${level} → ${level + 1} (${cost}c)`;
                buttons.push(this.makeStationButton(cx, y, label, () => this.buyUpgrade(key)));
            });
        }

        this.refreshStationStatus();
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
                `Dmg ${p.weaponDamage}  Rate ${p.fireRate}ms  Cap ${p.cargoCapacity}`
            ].join('\n'));
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

    handleCombat() {
        // Player shots vs NPCs
        this.projectiles = this.projectiles.filter((proj) => {
            if (!proj.update()) return false;
            for (const npc of this.npcs) {
                if (!npc.alive) continue;
                const dist = Phaser.Math.Distance.Between(proj.getX(), proj.getY(), npc.getX(), npc.getY());
                if (dist < 24) {
                    const hitX = npc.getX();
                    const hitY = npc.getY();
                    const bounty = npc.bounty;
                    const type = npc.type;
                    const destroyed = npc.takeDamage(proj.damage);
                    proj.destroy();
                    if (destroyed) {
                        this.player.credits += bounty;
                        this.player.kills += 1;
                        this.showToast(`Destroyed ${type}! +${bounty}c`);
                        this.spawnExplosion(hitX, hitY);
                    }
                    return false;
                }
            }
            return true;
        });

        // Enemy shots vs player
        this.enemyProjectiles = this.enemyProjectiles.filter((proj) => {
            if (!proj.update()) return false;
            const dist = Phaser.Math.Distance.Between(
                proj.getX(), proj.getY(),
                this.player.getX(), this.player.getY()
            );
            if (dist < 26) {
                const dead = this.player.takeDamage(proj.damage);
                proj.destroy();
                this.cameras.main.shake(80, 0.004);
                if (dead) this.triggerGameOver();
                return false;
            }
            return true;
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

        const snapshot = this.player.getSnapshot();
        // Respawn with upgrades/credits/cargo/kills; hull & shields refill
        snapshot.hull = undefined;
        snapshot.shields = undefined;

        this.player.destroy();
        this.player = new Player(this, this.worldSize / 2 - 800, this.worldSize / 2, snapshot);
        this.cameras.main.startFollow(this.player.container, true, 0.12, 0.12);
        this.gameOver = false;
        this.dockButton.setText('DOCK');
        this.showToast('Respawned. Upgrades and cargo retained.');
    }

    maybeRespawnNPCs() {
        this.npcs = this.npcs.filter((n) => n.alive);
        if (this.npcs.length < 3) {
            const c = this.worldSize / 2;
            const type = Math.random() > 0.45 ? 'fighter' : 'trader';
            const angle = Math.random() * Math.PI * 2;
            const dist = 900 + Math.random() * 900;
            this.npcs.push(new NPCShip(
                this,
                c + Math.cos(angle) * dist,
                c + Math.sin(angle) * dist,
                type
            ));
            this.showToast(`Incoming ${type}...`);
        }
    }

    update(time, delta) {
        if (!this.player) return;

        if (!this.gameOver && !this.isDocked) {
            this.player.update(delta, this.leftJoystick, this.rightJoystick);
            if (this.fireKey && this.fireKey.isDown) this.fireWeapon();
        }

        const inDockingRange = this.station.update(this.player.getX(), this.player.getY());
        this.npcs.forEach((npc) => npc.update(time, delta, this.player));

        if (!this.gameOver) this.handleCombat();
        this.maybeRespawnNPCs();

        if (inDockingRange && !this.isDocked) {
            this.dockButton.setAlpha(1);
        } else if (!this.isDocked) {
            this.dockButton.setAlpha(0);
        }

        if (this.dockKey && Phaser.Input.Keyboard.JustDown(this.dockKey)) {
            this.attemptDocking();
        }

        if (this.toastText.alpha > 0 && Date.now() > this.statusMessageUntil) {
            this.toastText.setAlpha(0);
        }

        const p = this.player;
        const u = p.upgrades;
        this.hudText.setText([
            `Credits: ${p.credits}   Kills: ${p.kills}`,
            `Shields: ${Math.round(p.shields)} / ${p.maxShields}`,
            `Hull: ${Math.round(p.hull)} / ${p.maxHull}`,
            `Cargo: ${p.getCargoUsed()}/${p.cargoCapacity}   Dmg: ${p.weaponDamage}`,
            `Upgrades E${u.engines} S${u.shields} H${u.hull} W${u.weapons} C${u.cargo}`,
            this.isDocked ? 'DOCKED' : (inDockingRange ? 'In docking range [D]' : '')
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
