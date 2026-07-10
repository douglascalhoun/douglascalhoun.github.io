import Phaser from 'phaser';

export default class Player {
    constructor(scene, x, y) {
        this.scene = scene;

        this.sprite = scene.add.graphics();
        this.drawShip();

        this.container = scene.add.container(x, y, [this.sprite]);
        this.container.setDepth(100);
        scene.physics.world.enable(this.container);

        this.body = this.container.body;
        this.body.setCircle(18, -18, -18);
        this.body.setDrag(0);
        this.body.setMaxVelocity(400);
        this.body.setCollideWorldBounds(true);

        this.rotation = 0;
        this.rotationSpeed = 0;
        this.maxRotationSpeed = 3;
        this.rotationAccel = 0.15;
        this.rotationDrag = 0.92;

        this.mainThrust = 200;
        this.reverseThrust = 100;
        this.lateralThrust = 150;

        this.maxShields = 100;
        this.shields = 100;
        this.maxHull = 100;
        this.hull = 100;
        this.shieldRegen = 8;
        this.shieldRegenDelay = 2500;
        this.lastHitTime = 0;

        this.credits = 500;
        this.cargo = {
            food: 0,
            ore: 0,
            tech: 0
        };
        this.cargoCapacity = 20;
    }

    drawShip() {
        this.sprite.clear();
        // Hull
        this.sprite.fillStyle(0x44ff88, 1);
        this.sprite.fillTriangle(0, -22, -14, 16, 14, 16);
        // Cockpit
        this.sprite.fillStyle(0xffffff, 1);
        this.sprite.fillCircle(0, -4, 4);
        // Engine glow
        this.sprite.fillStyle(0x66aaff, 0.9);
        this.sprite.fillTriangle(-6, 16, 6, 16, 0, 24);
        // Outline for contrast
        this.sprite.lineStyle(2, 0x0a2a14, 1);
        this.sprite.strokeTriangle(0, -22, -14, 16, 14, 16);
    }

    update(delta, leftJoystick, rightJoystick, keys = null) {
        const dt = delta / 1000;

        // Rotation: A/D keyboard or left joystick
        let rotInput = 0;
        if (keys) {
            if (keys.A.isDown) rotInput -= 1;
            if (keys.D.isDown) rotInput += 1;
        }
        if (leftJoystick && leftJoystick.isActive()) {
            rotInput += Math.cos(leftJoystick.getAngle()) * leftJoystick.getForce();
        }

        if (Math.abs(rotInput) > 0.01) {
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

        // Thrust: W/S forward/back, J/K strafe, or right joystick
        let forwardInput = 0; // +1 forward, -1 reverse
        let lateralInput = 0; // +1 right, -1 left

        if (keys) {
            if (keys.W.isDown) forwardInput += 1;
            if (keys.S.isDown) forwardInput -= 1;
            if (keys.K.isDown) lateralInput += 1;
            if (keys.J.isDown) lateralInput -= 1;
        }

        if (rightJoystick && rightJoystick.isActive()) {
            const force = rightJoystick.getForce();
            const angle = rightJoystick.getAngle();
            // Joystick: up = forward (negative sin in screen space), left/right = strafe
            forwardInput += -Math.sin(angle) * force;
            lateralInput += Math.cos(angle) * force;
        }

        forwardInput = Phaser.Math.Clamp(forwardInput, -1, 1);
        lateralInput = Phaser.Math.Clamp(lateralInput, -1, 1);

        const shipForwardX = Math.sin(this.rotation);
        const shipForwardY = -Math.cos(this.rotation);
        const shipRightX = Math.cos(this.rotation);
        const shipRightY = Math.sin(this.rotation);

        let thrustMagnitude = 0;
        if (forwardInput > 0) {
            thrustMagnitude = forwardInput * this.mainThrust;
        } else if (forwardInput < 0) {
            thrustMagnitude = forwardInput * this.reverseThrust;
        }

        if (Math.abs(forwardInput) > 0.01 || Math.abs(lateralInput) > 0.01) {
            this.body.setAcceleration(
                shipForwardX * thrustMagnitude + shipRightX * lateralInput * this.lateralThrust,
                shipForwardY * thrustMagnitude + shipRightY * lateralInput * this.lateralThrust
            );
        } else {
            this.body.setAcceleration(0, 0);
        }

        this.regenShields(delta);
    }

    regenShields(delta) {
        if (this.shields >= this.maxShields) return;
        if (Date.now() - this.lastHitTime < this.shieldRegenDelay) return;
        this.shields = Math.min(this.maxShields, this.shields + this.shieldRegen * (delta / 1000));
    }

    takeDamage(amount) {
        this.lastHitTime = Date.now();
        let remaining = amount;

        if (this.shields > 0) {
            const absorbed = Math.min(this.shields, remaining);
            this.shields -= absorbed;
            remaining -= absorbed;
        }

        if (remaining > 0) {
            this.hull -= remaining;
        }

        this.flashHit();
        return this.hull <= 0;
    }

    flashHit() {
        this.container.setAlpha(0.4);
        this.scene.time.delayedCall(80, () => {
            if (this.container && this.container.active) {
                this.container.setAlpha(1);
            }
        });
    }

    repair(costPerPoint = 2) {
        const missing = Math.ceil(this.maxHull - this.hull + this.maxShields - this.shields);
        if (missing <= 0) return { repaired: false, cost: 0, message: 'Ship already at full integrity.' };

        const affordable = Math.floor(this.credits / costPerPoint);
        const points = Math.min(missing, affordable);
        if (points <= 0) return { repaired: false, cost: 0, message: 'Not enough credits.' };

        let remaining = points;
        const shieldNeed = this.maxShields - this.shields;
        const shieldFill = Math.min(shieldNeed, remaining);
        this.shields += shieldFill;
        remaining -= shieldFill;
        this.hull = Math.min(this.maxHull, this.hull + remaining);

        const cost = points * costPerPoint;
        this.credits -= cost;
        return { repaired: true, cost, message: `Repaired for ${cost} credits.` };
    }

    getCargoUsed() {
        return this.cargo.food + this.cargo.ore + this.cargo.tech;
    }

    getX() {
        return this.container.x;
    }

    getY() {
        return this.container.y;
    }

    getRotation() {
        return this.rotation;
    }

    getVelocity() {
        return {
            x: this.body.velocity.x,
            y: this.body.velocity.y
        };
    }

    getSpeed() {
        return Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
    }

    destroy() {
        this.container.destroy();
    }
}
