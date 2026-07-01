export default class Projectile {
    constructor(scene, x, y, angle, speed = 400) {
        this.scene = scene;
        
        // Create projectile sprite
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0xff0000, 1);
        this.sprite.fillCircle(0, 0, 3);
        this.sprite.setPosition(x, y);
        
        // Physics container
        this.container = scene.add.container(x, y);
        this.container.add(this.sprite);
        scene.physics.world.enable(this.container);
        
        this.body = this.container.body;
        this.body.setVelocity(
            Math.sin(angle) * speed,
            -Math.cos(angle) * speed
        );
        
        // Lifetime
        this.lifetime = 2000; // 2 seconds
        this.created = Date.now();
    }
    
    update() {
        // Check if should be destroyed
        if (Date.now() - this.created > this.lifetime) {
            this.destroy();
            return false;
        }
        return true;
    }
    
    destroy() {
        this.container.destroy();
        this.sprite.destroy();
    }
    
    getX() {
        return this.container.x;
    }
    
    getY() {
        return this.container.y;
    }
}
