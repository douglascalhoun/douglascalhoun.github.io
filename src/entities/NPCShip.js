export default class NPCShip {
    constructor(scene, x, y, type = 'trader') {
        this.scene = scene;
        this.type = type;
        this.speed = type === 'trader' ? 50 : 100;
        
        // Create ship sprite
        this.sprite = scene.add.graphics();
        this.drawShip(type);
        this.sprite.setPosition(x, y);
        
        // Physics container
        this.container = scene.add.container(x, y);
        this.container.add(this.sprite);
        scene.physics.world.enable(this.container);
        
        this.body = this.container.body;
        this.body.setMaxVelocity(this.speed);
        
        // AI properties
        this.targetX = x;
        this.targetY = y;
        this.wanderTimer = 0;
        this.wanderInterval = Phaser.Math.Between(3000, 6000);
        
        // Pick random patrol point
        this.pickNewTarget();
    }
    
    drawShip(type) {
        if (type === 'trader') {
            // Boxy trader ship - blue
            this.sprite.fillStyle(0x4444ff, 1);
            this.sprite.fillRect(-8, -6, 16, 12);
            this.sprite.fillRect(-4, -10, 8, 4);
            this.sprite.fillStyle(0x6666ff, 1);
            this.sprite.fillCircle(0, 0, 3);
        } else {
            // Sleek fighter ship - orange
            this.sprite.fillStyle(0xff8800, 1);
            this.sprite.fillTriangle(0, -12, -6, 8, 6, 8);
            this.sprite.fillStyle(0xffaa44, 1);
            this.sprite.fillCircle(0, 0, 2);
        }
    }
    
    pickNewTarget() {
        const worldSize = 10000;
        const centerX = worldSize / 2;
        const centerY = worldSize / 2;
        const maxDistance = 2000;
        
        // Pick a random point near the center
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * maxDistance;
        
        this.targetX = centerX + Math.cos(angle) * distance;
        this.targetY = centerY + Math.sin(angle) * distance;
    }
    
    update(time, delta) {
        // Update wander timer
        this.wanderTimer += delta;
        if (this.wanderTimer > this.wanderInterval) {
            this.pickNewTarget();
            this.wanderTimer = 0;
            this.wanderInterval = Phaser.Math.Between(3000, 6000);
        }
        
        // Move towards target
        const dx = this.targetX - this.container.x;
        const dy = this.targetY - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 50) {
            const angle = Math.atan2(dy, dx);
            this.body.setVelocity(
                Math.cos(angle) * this.speed,
                Math.sin(angle) * this.speed
            );
            
            // Rotate ship to face direction
            this.container.setRotation(angle + Math.PI / 2);
        } else {
            this.body.setVelocity(0, 0);
            this.pickNewTarget();
        }
    }
}
