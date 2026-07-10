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
        this.body.setCircle(16, -16, -16);
        // Mild drag = you settle into a fight instead of coasting past forever
        this.body.setDrag(40);
        this.body.setMaxVelocity(260);
        this.body.setCollideWorldBounds(true);

        this.rotation = 0;
        this.rotationSpeed = 0;
        // High turn authority for tactical circling
        this.maxRotationSpeed = 7.2;
        this.rotationAccel = 0.85;
        this.rotationDrag = 0.78;
        // Hard turns bleed speed (naval / sailing feel)
        this.turnBleed = 0.55;

        // Strong accel to a low top speed — responsive, not fast
        this.mainThrust = 380;
        this.reverseThrust = 420; // reverse is your brake
        this.lateralThrust = 360;

        this.maxShields = 100;
        this.shields = 100;
        this.maxHull = 100;
        this.hull = 100;
        this.shieldRegen = 10;
        this.shieldRegenDelay = 2200;
        this.lastHitTime = 0;

        this.credits = 500;
        this.cargo = { food: 0, ore: 0, tech: 0 };
        this.cargoCapacity = 20;
    }

    drawShip() {
        this.sprite.clear();
        this.sprite.fillStyle(0x44ff88, 1);
        this.sprite.fillTriangle(0, -22, -14, 16, 14, 16);
        this.sprite.fillStyle(0xffffff, 1);
        this.sprite.fillCircle(0, -4, 4);
        this.sprite.fillStyle(0x66aaff, 0.95);
        this.sprite.fillTriangle(-6, 16, 6, 16, 0, 26);
        this.sprite.lineStyle(2, 0x0a2a14, 1);
        this.sprite.strokeTriangle(0, -22, -14, 16, 14, 16);
    }

    update(delta, leftJoystick, rightJoystick, keys = null) {
        const dt = delta / 1000;

        let rotInput = 0;
        if (keys) {
            if (keys.A.isDown) rotInput -= 1;
            if (keys.D.isDown) rotInput += 1;
        }
        if (leftJoystick && leftJoystick.isActive()) {
            rotInput += Math.cos(leftJoystick.getAngle()) * leftJoystick.getForce();
        }

        if (Math.abs(rotInput) > 0.01) {
            this.rotationSpeed = Phaser.Math.Linear(
                this.rotationSpeed,
                rotInput * this.maxRotationSpeed,
                Math.min(1, this.rotationAccel * 10 * dt)
            );
        } else {
            this.rotationSpeed *= Math.pow(this.rotationDrag, dt * 60);
            if (Math.abs(this.rotationSpeed) < 0.02) this.rotationSpeed = 0;
        }

        this.rotation += this.rotationSpeed * dt;
        this.container.setRotation(this.rotation);

        // Naval bleed: turning hard bleeds forward speed so you don't overshoot
        const turnAmount = Math.min(1, Math.abs(this.rotationSpeed) / this.maxRotationSpeed);
        if (turnAmount > 0.15) {
            const bleed = 1 - turnAmount * this.turnBleed * dt * 3.2;
            this.body.velocity.x *= bleed;
            this.body.velocity.y *= bleed;
        }

        let forwardInput = 0;
        let lateralInput = 0;

        if (keys) {
            if (keys.W.isDown) forwardInput += 1;
            if (keys.S.isDown) forwardInput -= 1;
            if (keys.K.isDown) lateralInput += 1;
            if (keys.J.isDown) lateralInput -= 1;
        }

        if (rightJoystick && rightJoystick.isActive()) {
            const force = rightJoystick.getForce();
            const angle = rightJoystick.getAngle();
            forwardInput += -Math.sin(angle) * force;
            lateralInput += Math.cos(angle) * force;
        }

        forwardInput = Phaser.Math.Clamp(forwardInput, -1, 1);
        lateralInput = Phaser.Math.Clamp(lateralInput, -1, 1);

        const shipForwardX = Math.sin(this.rotation);
        const shipForwardY = -Math.cos(this.rotation);
        const shipRightX = Math.cos(this.rotation);
        const shipRightY = Math.sin(this.rotation);

        // Prefer thrusting along facing — sideways drift is for orbiting, not racing
        let thrustMagnitude = 0;
        if (forwardInput > 0) thrustMagnitude = forwardInput * this.mainThrust;
        else if (forwardInput < 0) thrustMagnitude = forwardInput * this.reverseThrust;

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
        if (remaining > 0) this.hull -= remaining;
        this.flashHit();
        return this.hull <= 0;
    }

    flashHit() {
        this.container.setAlpha(0.4);
        this.scene.time.delayedCall(80, () => {
            if (this.container && this.container.active) this.container.setAlpha(1);
        });
    }

    repair(costPerPoint = 2) {
        const missing = Math.ceil(this.maxHull - this.hull + this.maxShields - this.shields);
        if (missing <= 0) return { repaired: false, cost: 0, message: 'Ship already at full integrity.' };
        const affordable = Math.floor(this.credits / costPerPoint);
        const points = Math.min(missing, affordable);
        if (points <= 0) return { repaired: false, cost: 0, message: 'Not enough credits.' };

        let remaining = points;
        const shieldFill = Math.min(this.maxShields - this.shields, remaining);
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

    getX() { return this.container.x; }
    getY() { return this.container.y; }
    getRotation() { return this.rotation; }
    getVelocity() {
        return { x: this.body.velocity.x, y: this.body.velocity.y };
    }
    getSpeed() {
        return Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
    }
    destroy() { this.container.destroy(); }
}
