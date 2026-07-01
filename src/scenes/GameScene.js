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
        this.physics.world.setBounds(0, 0, worldSize, worldSize);
        
        this.createStarField(worldSize);
        this.createPlanet(worldSize / 2, worldSize / 2, 300);
        this.createSystemBoundary(worldSize / 2, worldSize / 2, worldSize * 0.45);
        
        // Add station near the planet
        this.station = new Station(this, worldSize / 2 + 600, worldSize / 2 - 400, "Outpost Alpha");
        
        // Add NPC ships
        this.npcs = [];
        this.npcs.push(new NPCShip(this, worldSize / 2 + 300, worldSize / 2 + 500, 'trader'));
        this.npcs.push(new NPCShip(this, worldSize / 2 - 500, worldSize / 2 + 300, 'trader'));
        this.npcs.push(new NPCShip(this, worldSize / 2 + 800, worldSize / 2 - 600, 'fighter'));
        
        this.player = new Player(this, worldSize / 2 - 800, worldSize / 2);
        
        this.cameras.main.startFollow(this.player.container, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, worldSize, worldSize);
        
        this.setupTouchControls();
        this.createDebugText();
        this.createDockButton();
        
        // Docking state
        this.isDocked = false;
        this.dockingUI = null;
        
        // Projectiles
        this.projectiles = [];
        this.lastFireTime = 0;
        this.fireRate = 250; // ms between shots
        
        // Setup keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.dockKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        this.scale.on('resize', this.onResize, this);
    }
    
    createStarField(worldSize) {
        this.starLayers = [];
        
        // Simplified static star field - minimal parallax
        const stars = this.add.graphics();
        stars.setDepth(-100);
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, worldSize);
            const y = Phaser.Math.Between(0, worldSize);
            const size = Phaser.Math.FloatBetween(0.8, 1.5);
            const alpha = Phaser.Math.FloatBetween(0.4, 0.7);
            stars.fillStyle(0xffffff, alpha);
            stars.fillCircle(x, y, size);
        }
        stars.setScrollFactor(0.05);
        this.starLayers.push(stars);
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
        
        this.planet = {
            graphics: planet,
            x: x,
            y: y,
            radius: radius
        };
    }
    
    createSystemBoundary(centerX, centerY, radius) {
        const boundary = this.add.graphics();
        
        const segments = 60;
        const dashLength = (2 * Math.PI * radius) / (segments * 2);
        
        for (let i = 0; i < segments; i++) {
            const startAngle = (i * 2 * Math.PI) / segments;
            const endAngle = startAngle + Math.PI / segments * 0.6;
            
            boundary.lineStyle(2, 0xff6600, 0.5);
            boundary.beginPath();
            boundary.arc(centerX, centerY, radius, startAngle, endAngle);
            boundary.strokePath();
        }
        
        boundary.setDepth(-40);
        
        this.systemBoundary = {
            graphics: boundary,
            x: centerX,
            y: centerY,
            radius: radius
        };
    }
    
    setupTouchControls() {
        const margin = 20;
        const joystickRadius = 50;
        const bottomMargin = 30;
        
        // Left joystick for rotation - far left edge
        this.leftJoystick = new VirtualJoystick(
            this,
            margin + joystickRadius,
            this.scale.height - bottomMargin - joystickRadius,
            joystickRadius,
            'left'
        );
        
        // Right joystick for thrust - far right edge
        this.rightJoystick = new VirtualJoystick(
            this,
            this.scale.width - margin - joystickRadius,
            this.scale.height - bottomMargin - joystickRadius,
            joystickRadius,
            'right'
        );
        
        // Labels
        this.leftLabel = this.add.text(
            margin + joystickRadius,
            this.scale.height - bottomMargin - joystickRadius - 70,
            'TURN',
            { fontSize: '12px', fill: '#666' }
        );
        this.leftLabel.setOrigin(0.5);
        this.leftLabel.setScrollFactor(0);
        this.leftLabel.setDepth(1000);
        
        this.rightLabel = this.add.text(
            this.scale.width - margin - joystickRadius,
            this.scale.height - bottomMargin - joystickRadius - 70,
            'THRUST',
            { fontSize: '12px', fill: '#666' }
        );
        this.rightLabel.setOrigin(0.5);
        this.rightLabel.setScrollFactor(0);
        this.rightLabel.setDepth(1000);
    }
    
    createDockButton() {
        // Dock button for mobile
        this.dockButton = this.add.text(
            this.scale.width / 2,
            this.scale.height - 50,
            'DOCK',
            {
                fontSize: '20px',
                fill: '#00ff00',
                backgroundColor: '#003300',
                padding: { x: 20, y: 10 }
            }
        );
        this.dockButton.setOrigin(0.5);
        this.dockButton.setScrollFactor(0);
        this.dockButton.setDepth(1500);
        this.dockButton.setAlpha(0);
        this.dockButton.setInteractive();
        
        this.dockButton.on('pointerdown', () => {
            this.attemptDocking();
        });
        
        // Fire button for mobile
        this.fireButton = this.add.circle(
            this.scale.width / 2,
            this.scale.height - 150,
            30,
            0xff0000,
            0.5
        );
        this.fireButton.setStrokeStyle(2, 0xff0000);
        this.fireButton.setScrollFactor(0);
        this.fireButton.setDepth(1500);
        this.fireButton.setInteractive();
        
        this.fireButton.on('pointerdown', () => {
            this.fireWeapon();
        });
        
        this.fireLabel = this.add.text(
            this.scale.width / 2,
            this.scale.height - 150,
            'FIRE',
            { fontSize: '12px', fill: '#ffffff' }
        );
        this.fireLabel.setOrigin(0.5);
        this.fireLabel.setScrollFactor(0);
        this.fireLabel.setDepth(1501);
    }
    
    fireWeapon() {
        const now = Date.now();
        if (now - this.lastFireTime < this.fireRate) return;
        if (this.isDocked) return;
        
        this.lastFireTime = now;
        
        // Create projectile at player position
        const projectile = new Projectile(
            this,
            this.player.getX(),
            this.player.getY(),
            this.player.container.rotation,
            500
        );
        
        this.projectiles.push(projectile);
    }
    
    attemptDocking() {
        if (this.isDocked) {
            this.undock();
        } else {
            const distance = Phaser.Math.Distance.Between(
                this.player.getX(),
                this.player.getY(),
                this.station.getX(),
                this.station.getY()
            );
            if (distance < 200) {
                this.dock();
            }
        }
    }
    
    dock() {
        this.isDocked = true;
        this.showStationUI();
        this.dockButton.setText('UNDOCK');
    }
    
    undock() {
        this.isDocked = false;
        this.hideStationUI();
        this.dockButton.setText('DOCK');
    }
    
    showStationUI() {
        if (this.dockingUI) return;
        
        // Create docking UI overlay
        const overlay = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width * 0.8,
            this.scale.height * 0.6,
            0x000000,
            0.9
        );
        overlay.setScrollFactor(0);
        overlay.setDepth(2000);
        
        const title = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2 - 150,
            `Welcome to ${this.station.getName()}`,
            { fontSize: '24px', fill: '#00ff00' }
        );
        title.setOrigin(0.5);
        title.setScrollFactor(0);
        title.setDepth(2001);
        
        const options = this.add.text(
            this.scale.width / 2,
            this.scale.height / 2,
            'Station Services:\n\n' +
            '• Refuel & Repairs\n' +
            '• Trade Goods\n' +
            '• Ship Upgrades\n' +
            '• Mission Board\n\n' +
            '(Coming Soon)',
            {
                fontSize: '18px',
                fill: '#ffffff',
                align: 'center',
                lineSpacing: 10
            }
        );
        options.setOrigin(0.5);
        options.setScrollFactor(0);
        options.setDepth(2001);
        
        this.dockingUI = {
            overlay,
            title,
            options
        };
    }
    
    hideStationUI() {
        if (this.dockingUI) {
            this.dockingUI.overlay.destroy();
            this.dockingUI.title.destroy();
            this.dockingUI.options.destroy();
            this.dockingUI = null;
        }
    }
    
    createDebugText() {
        this.debugText = this.add.text(16, 16, '', {
            fontSize: '16px',
            fill: '#00ff00',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        });
        this.debugText.setScrollFactor(0);
        this.debugText.setDepth(2000);
        
        // Add center screen indicator to verify camera/rendering works
        this.centerMarker = this.add.circle(0, 0, 50, 0x00ffff, 0.5);
        this.centerMarker.setScrollFactor(0);
        this.centerMarker.setDepth(2000);
    }
    
    update(time, delta) {
        if (!this.player) return;
        
        // Don't update player if docked
        if (!this.isDocked) {
            this.player.update(delta, this.leftJoystick, this.rightJoystick);
        }
        
        // Update station
        const inDockingRange = this.station.update(this.player.getX(), this.player.getY());
        
        // Update NPCs
        this.npcs.forEach(npc => npc.update(time, delta));
        
        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => proj.update());
        
        // Check for fire key
        if (this.fireKey.isDown) {
            this.fireWeapon();
        }
        
        // Show/hide dock button based on range
        if (inDockingRange && !this.isDocked) {
            this.dockButton.setAlpha(1);
        } else if (!this.isDocked) {
            this.dockButton.setAlpha(0);
        }
        
        // Check for dock key press
        if (Phaser.Input.Keyboard.JustDown(this.dockKey)) {
            this.attemptDocking();
        }
        
        const speed = Math.round(this.player.getSpeed());
        const distanceToStation = Math.round(Phaser.Math.Distance.Between(
            this.player.getX(),
            this.player.getY(),
            this.station.getX(),
            this.station.getY()
        ));
        
        let statusText = [
            `Speed: ${speed}`,
            `Distance to station: ${distanceToStation}`,
        ];
        
        if (inDockingRange && !this.isDocked) {
            statusText.push('[ Press D to DOCK ]');
        } else if (this.isDocked) {
            statusText.push('[ DOCKED - Press D to UNDOCK ]');
        }
        
        this.debugText.setText(statusText);
    }
    
    onResize(gameSize) {
        const { width, height } = gameSize;
        const margin = 20;
        const joystickRadius = 50;
        const bottomMargin = 30;
        
        if (this.leftJoystick) {
            this.leftJoystick.setPosition(
                margin + joystickRadius,
                height - bottomMargin - joystickRadius
            );
            this.leftLabel.setPosition(
                margin + joystickRadius,
                height - bottomMargin - joystickRadius - 70
            );
        }
        
        if (this.rightJoystick) {
            this.rightJoystick.setPosition(
                width - margin - joystickRadius,
                height - bottomMargin - joystickRadius
            );
            this.rightLabel.setPosition(
                width - margin - joystickRadius,
                height - bottomMargin - joystickRadius - 70
            );
        }
    }
}
