export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;
        
        // Create ship sprite (triangle for now, can be replaced with actual sprite)
        this.sprite = scene.add.graphics();
        this.sprite.fillStyle(0x00ff00, 1);
        this.sprite.fillTriangle(0, -15, -10, 10, 10, 10);
        this.sprite.setPosition(x, y);
        
        // Convert graphics to a game object we can add physics to
        this.container = scene.add.container(x, y);
        this.container.add(this.sprite);
        scene.physics.world.enable(this.container);
        
        // Physics properties - mimicking EV Nova's feel
        this.body = this.container.body;
        this.body.setDrag(0); // No drag in space
        this.body.setMaxVelocity(400);
        
        // Ship properties
        this.rotation = 0; // Radians
        this.rotationSpeed = 0;
        this.maxRotationSpeed = 3; // rad/s
        this.rotationAccel = 0.15;
        this.rotationDrag = 0.92;
        
        // Thrust properties
        this.mainThrust = 200; // Forward thrust
        this.reverseThrust = 100; // Reverse thrust
        this.lateralThrust = 150; // Side thrust
        
        // Engine trail effect
        this.engineParticles = null;
    }
    
    update(delta, leftJoystick, rightJoystick) {
        const dt = delta / 1000; // Convert to seconds
        
        // ROTATION CONTROL (left joystick)
        if (leftJoystick.isActive()) {
            const force = leftJoystick.getForce();
            const angle = leftJoystick.getAngle();
            
            // Horizontal component controls rotation
            const rotInput = Math.cos(angle) * force;
            this.rotationSpeed += rotInput * this.rotationAccel;
            
            // Clamp rotation speed
            this.rotationSpeed = Phaser.Math.Clamp(
                this.rotationSpeed,
                -this.maxRotationSpeed,
                this.maxRotationSpeed
            );
        } else {
            // Apply rotation drag when not actively turning
            this.rotationSpeed *= this.rotationDrag;
            if (Math.abs(this.rotationSpeed) < 0.01) this.rotationSpeed = 0;
        }
        
        // Update rotation
        this.rotation += this.rotationSpeed * dt;
        this.container.setRotation(this.rotation);
        
        // THRUST CONTROL (right joystick)
        if (rightJoystick.isActive()) {
            const force = rightJoystick.getForce();
            const angle = rightJoystick.getAngle();
            
            // Convert joystick angle to thrust direction in world space
            const thrustX = Math.cos(angle) * force;
            const thrustY = Math.sin(angle) * force;
            
            // Apply thrust relative to ship's facing
            // Forward/backward (relative to joystick vertical)
            const forwardComponent = Math.sin(angle) * force;
            const lateralComponent = Math.cos(angle) * force;
            
            // Calculate thrust in world space based on ship rotation
            const shipForwardX = Math.sin(this.rotation);
            const shipForwardY = -Math.cos(this.rotation);
            const shipRightX = Math.cos(this.rotation);
            const shipRightY = Math.sin(this.rotation);
            
            // Forward/reverse thrust
            let thrustMagnitude;
            if (forwardComponent < 0) {
                // Forward thrust (joystick up)
                thrustMagnitude = Math.abs(forwardComponent) * this.mainThrust;
            } else {
                // Reverse thrust (joystick down)
                thrustMagnitude = -forwardComponent * this.reverseThrust;
            }
            
            const forwardThrustX = shipForwardX * thrustMagnitude;
            const forwardThrustY = shipForwardY * thrustMagnitude;
            
            // Lateral thrust (left/right)
            const lateralThrustX = shipRightX * lateralComponent * this.lateralThrust;
            const lateralThrustY = shipRightY * lateralComponent * this.lateralThrust;
            
            // Apply combined thrust
            this.body.setAcceleration(
                forwardThrustX + lateralThrustX,
                forwardThrustY + lateralThrustY
            );
        } else {
            // No thrust
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
