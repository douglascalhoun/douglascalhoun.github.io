import Player from '../entities/Player.js';
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
        
        this.player = new Player(this, worldSize / 2 - 800, worldSize / 2);
        
        this.cameras.main.startFollow(this.player.container, true, 0.1, 0.1);
        this.cameras.main.setBounds(0, 0, worldSize, worldSize);
        
        this.setupTouchControls();
        this.createDebugText();
        
        this.scale.on('resize', this.onResize, this);
    }
    
    createStarField(worldSize) {
        this.starLayers = [];
        
        const bgStars = this.add.graphics();
        bgStars.setDepth(-100);
        for (let i = 0; i < 200; i++) {
            const x = Phaser.Math.Between(0, worldSize);
            const y = Phaser.Math.Between(0, worldSize);
            const size = Phaser.Math.FloatBetween(0.5, 1.5);
            const alpha = Phaser.Math.FloatBetween(0.3, 0.8);
            bgStars.fillStyle(0xffffff, alpha);
            bgStars.fillCircle(x, y, size);
        }
        bgStars.setScrollFactor(0.1);
        this.starLayers.push(bgStars);
        
        const midStars = this.add.graphics();
        midStars.setDepth(-90);
        for (let i = 0; i < 150; i++) {
            const x = Phaser.Math.Between(0, worldSize);
            const y = Phaser.Math.Between(0, worldSize);
            const size = Phaser.Math.FloatBetween(1, 2);
            const alpha = Phaser.Math.FloatBetween(0.5, 1);
            midStars.fillStyle(0xffffff, alpha);
            midStars.fillCircle(x, y, size);
        }
        midStars.setScrollFactor(0.3);
        this.starLayers.push(midStars);
        
        const fgStars = this.add.graphics();
        fgStars.setDepth(-80);
        for (let i = 0; i < 100; i++) {
            const x = Phaser.Math.Between(0, worldSize);
            const y = Phaser.Math.Between(0, worldSize);
            const size = Phaser.Math.FloatBetween(1.5, 3);
            fgStars.fillStyle(0xffffff, 1);
            fgStars.fillCircle(x, y, size);
        }
        fgStars.setScrollFactor(0.6);
        this.starLayers.push(fgStars);
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
        const margin = 80;
        const joystickRadius = 60;
        const bottomMargin = 100;
        
        this.leftJoystick = new VirtualJoystick(
            this,
            margin + joystickRadius,
            this.scale.height - bottomMargin,
            joystickRadius,
            'left'
        );
        
        this.rightJoystick = new VirtualJoystick(
            this,
            this.scale.width - margin - joystickRadius,
            this.scale.height - bottomMargin,
            joystickRadius,
            'right'
        );
        
        this.leftLabel = this.add.text(
            margin + joystickRadius,
            this.scale.height - bottomMargin - 100,
            'TURN',
            { fontSize: '14px', fill: '#888' }
        );
        this.leftLabel.setOrigin(0.5);
        this.leftLabel.setScrollFactor(0);
        this.leftLabel.setDepth(1000);
        
        this.rightLabel = this.add.text(
            this.scale.width - margin - joystickRadius,
            this.scale.height - bottomMargin - 100,
            'THRUST',
            { fontSize: '14px', fill: '#888' }
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
        const margin = 80;
        const joystickRadius = 60;
        const bottomMargin = 100;
        
        if (this.leftJoystick) {
            this.leftJoystick.setPosition(
                margin + joystickRadius,
                height - bottomMargin
            );
            this.leftLabel.setPosition(
                margin + joystickRadius,
                height - bottomMargin - 100
            );
        }
        
        if (this.rightJoystick) {
            this.rightJoystick.setPosition(
                width - margin - joystickRadius,
                height - bottomMargin
            );
            this.rightLabel.setPosition(
                width - margin - joystickRadius,
                height - bottomMargin - 100
            );
        }
    }
}
