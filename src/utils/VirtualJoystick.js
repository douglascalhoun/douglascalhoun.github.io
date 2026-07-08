import Phaser from 'phaser';

export default class VirtualJoystick {
    constructor(scene, x, y, radius = 60, side = 'left') {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.side = side;
        this.active = false;
        
        // Create visual elements with lower opacity
        this.baseCircle = scene.add.circle(x, y, radius, 0x333333, 0.15);
        this.baseCircle.setDepth(1000);
        this.baseCircle.setScrollFactor(0);
        
        this.stickCircle = scene.add.circle(x, y, radius * 0.5, 0x666666, 0.3);
        this.stickCircle.setDepth(1001);
        this.stickCircle.setScrollFactor(0);
        
        this.pointer = null;
        this.startX = x;
        this.startY = y;
        this.force = 0;
        this.angle = 0;
        
        this.setupInput();
    }
    
    setupInput() {
        const hitArea = new Phaser.Geom.Circle(0, 0, this.radius * 2);
        this.baseCircle.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
        
        this.baseCircle.on('pointerdown', (pointer) => {
            if (this.side === 'left' && pointer.x > this.scene.scale.width / 2) return;
            if (this.side === 'right' && pointer.x < this.scene.scale.width / 2) return;
            
            this.active = true;
            this.pointer = pointer;
        });
        
        this.scene.input.on('pointermove', (pointer) => {
            if (this.active && this.pointer === pointer) {
                this.updateStick(pointer);
            }
        });
        
        this.scene.input.on('pointerup', (pointer) => {
            if (this.pointer === pointer) {
                this.active = false;
                this.pointer = null;
                this.reset();
            }
        });
    }
    
    updateStick(pointer) {
        const dx = pointer.x - this.startX;
        const dy = pointer.y - this.startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        this.force = Math.min(distance / this.radius, 1);
        this.angle = Math.atan2(dy, dx);
        
        const clampedDistance = Math.min(distance, this.radius);
        this.stickCircle.x = this.startX + Math.cos(this.angle) * clampedDistance;
        this.stickCircle.y = this.startY + Math.sin(this.angle) * clampedDistance;
    }
    
    reset() {
        this.force = 0;
        this.angle = 0;
        this.stickCircle.x = this.startX;
        this.stickCircle.y = this.startY;
    }
    
    getForce() {
        return this.force;
    }
    
    getAngle() {
        return this.angle;
    }
    
    isActive() {
        return this.active;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.baseCircle.setPosition(x, y);
        this.stickCircle.setPosition(x, y);
    }
    
    destroy() {
        this.baseCircle.destroy();
        this.stickCircle.destroy();
    }
}
