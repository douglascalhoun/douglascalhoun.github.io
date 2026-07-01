import Player from '../entities/Player.js';
import Station from '../entities/Station.js';
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
        
        this.player = new Player(this, worldSize / 2 - 800, worldSize / 2);
        
        this.cameras.main.startFollow(this.player.container, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, worldSize, worldSize);
        
        this.setupTouchControls();
        this.createDebugText();
        
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
    
    createDebugText() {
        this.debugText = this.add.text(16, 16, '', {
            fontSize: '14px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 5 }
        });
        this.debugText.setScrollFactor(0);
        this.debugText.setDepth(2000);
    }
    
    update(time, delta) {
        if (!this.player) return;
        
        this.player.update(delta, this.leftJoystick, this.rightJoystick);
        
        const speed = Math.round(this.player.getSpeed());
        const distanceToPlanet = Math.round(Phaser.Math.Distance.Between(
            this.player.getX(),
            this.player.getY(),
            this.planet.x,
            this.planet.y
        ));
        const distanceToBoundary = Math.round(
            this.systemBoundary.radius - Phaser.Math.Distance.Between(
                this.player.getX(),
                this.player.getY(),
                this.systemBoundary.x,
                this.systemBoundary.y
            )
        );
        
        this.debugText.setText([
            `Speed: ${speed}`,
            `Distance to planet: ${distanceToPlanet}`,
            `Distance to boundary: ${distanceToBoundary}`,
            `Position: ${Math.round(this.player.getX())}, ${Math.round(this.player.getY())}`
        ]);
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
