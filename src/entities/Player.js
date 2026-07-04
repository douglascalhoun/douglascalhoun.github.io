export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        
        // Add a HUGE visible circle to debug positioning
        this.debugCircle = scene.add.circle(0, 0, 100, 0xff00ff, 1);
        this.debugCircle.setDepth(1000);
        
        // Create ship sprite - much larger and bright yellow
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0xffff00, 1);  // Bright yellow
        this.sprite.fillTriangle(0, -40, -25, 25, 25, 25);  // Even larger triangle
        // Add cockpit detail
        this.sprite.fillStyle(0xff0000, 1);
        this.sprite.fillCircle(0, -10, 8);
        this.sprite.setPosition(x, y);
        
        this.container = scene.add.container(x, y);
        this.container.add(this.debugCircle);
        this.container.add(this.sprite);
        this.container.setDepth(1000);  // Put it way on top
        scene.physics.world.enable(this.container);
        
        this.body = this.container.body;
        this.body.setDrag(0);
        this.body.setMaxVelocity(400);
        
        this.rotation = 0;
        this.rotationSpeed = 0;
        this.maxRotationSpeed = 3;
        this.rotationAccel = 0.15;
        this.rotationDrag = 0.92;
        
        this.mainThrust = 200;
        this.reverseThrust = 100;
        this.lateralThrust = 150;
        
        this.engineParticles = null;
    }
    
    update(delta, leftJoystick, rightJoystick) {
        const dt = delta / 1000;
        
        if (leftJoystick.isActive()) {
            const force = leftJoystick.getForce();
            const angle = leftJoystick.getAngle();
            
            const rotInput = Math.cos(angle) * force;
            this.rotationSpeed += rotInput * this.rotationAccel;
            
            this.rotationSpeed = Phaser.Math.Clamp(
                this.rotationSpeed,
                -this.maxRotationSpeed,
                this.maxRotationSpeed
            );
        } else {
            this.rotationSpeed *= this.rotationDrag;
            if (Math.abs(this.rotationSpeed) < 0.01) this.rotationSpeed = 0;
        }
        
        this.rotation += this.rotationSpeed * dt;
        this.container.setRotation(this.rotation);
        
        if (rightJoystick.isActive()) {
            const force = rightJoystick.getForce();
            const angle = rightJoystick.getAngle();
            
            const thrustX = Math.cos(angle) * force;
            const thrustY = Math.sin(angle) * force;
            
            const forwardComponent = Math.sin(angle) * force;
            const lateralComponent = Math.cos(angle) * force;
            
            const shipForwardX = Math.sin(this.rotation);
            const shipForwardY = -Math.cos(this.rotation);
            const shipRightX = Math.cos(this.rotation);
            const shipRightY = Math.sin(this.rotation);
            
            let thrustMagnitude;
            if (forwardComponent < 0) {
                thrustMagnitude = Math.abs(forwardComponent) * this.mainThrust;
            } else {
                thrustMagnitude = -forwardComponent * this.reverseThrust;
            }
            
            const forwardThrustX = shipForwardX * thrustMagnitude;
            const forwardThrustY = shipForwardY * thrustMagnitude;
            
            const lateralThrustX = shipRightX * lateralComponent * this.lateralThrust;
            const lateralThrustY = shipRightY * lateralComponent * this.lateralThrust;
            
            this.body.setAcceleration(
                forwardThrustX + lateralThrustX,
                forwardThrustY + lateralThrustY
            );
        } else {
            this.body.setAcceleration(0, 0);
        }
    }
    
    getX() {
        return this.container.x;
    }
    
    getY() {
        return this.container.y;
    }
    
    getVelocity() {
        return {
            x: this.body.velocity.x,
            y: this.body.velocity.y
        };
    }
    
    getSpeed() {
        return Math.sqrt(
            this.body.velocity.x ** 2 + 
            this.body.velocity.y ** 2
        );
    }
}
