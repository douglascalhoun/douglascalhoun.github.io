import Phaser from 'phaser';

/**
 * Cannonball / bolt — Image + Arcade body, with glow + ember trail.
 * Angle uses ship convention: 0 = nose up.
 */
export default class Projectile extends Phaser.Physics.Arcade.Image {
    /**
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     * @param {number} angle
     * @param {object|number} optsOrSpeed
     * @param {object} [maybeOpts]
     */
    constructor(scene, x, y, angle, optsOrSpeed = {}, maybeOpts = null) {
        const opts = typeof optsOrSpeed === 'number'
            ? { ...(maybeOpts || {}), speed: optsOrSpeed }
            : (optsOrSpeed || {});

        const kind = opts.kind || (opts.seek ? 'missile' : opts.blast || opts.blastRadius ? 'bomb' : 'laser');
        const key = kind === 'missile' ? 'boltMissile' : kind === 'bomb' ? 'boltBall' : 'boltLaser';
        const ballKey = scene.textures.exists('boltBall') ? 'boltBall' : key;

        super(scene, x, y, ballKey);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.owner = opts.owner || null;
        this.friendly = opts.friendly ?? opts.fromPlayer ?? false;
        this.speed = opts.speed ?? 420;
        this.lifeMs = opts.lifeMs ?? opts.lifetime ?? 900;
        this.damage = opts.damage ?? 1;
        this.color = opts.color ?? 0xffcc66;
        this.seek = typeof opts.seek === 'number' ? opts.seek : (opts.seek ? 0.045 : 0);
        this.blastRadius = opts.blastRadius ?? opts.blast ?? 0;
        this.kind = kind;
        this.radius = opts.radius ?? 7;
        this._alive = true;
        this._born = scene.time.now;
        this._trailAcc = 0;
        this.showTrail = opts.trail !== false;

        // Back-compat for any code touching .sprite
        this.sprite = this;
        this.bolt = this;

        const lateral = opts.lateral || 0;
        if (lateral) {
            this.x += Math.cos(angle) * lateral;
            this.y += Math.sin(angle) * lateral;
        }

        const scale = opts.scale ?? (this.friendly ? 0.68 : 0.75);
        this.setScale(scale);
        this.setDepth(112);
        // Keep a warm tint but don't crush the baked highlights
        this.setTint(Phaser.Display.Color.GetColor(
            Math.min(255, ((this.color >> 16) & 0xff) + 55),
            Math.min(255, ((this.color >> 8) & 0xff) + 30),
            Math.min(255, (this.color & 0xff) + 10)
        ));

        // Outer glow (additive) — sits under the ball
        if (scene.textures.exists('boltBallGlow')) {
            this.glow = scene.add.image(x, y, 'boltBallGlow');
            this.glow.setDepth(111);
            this.glow.setScale(scale * 1.55);
            this.glow.setTint(this.color);
            this.glow.setAlpha(0.95);
            if (Phaser.BlendModes) this.glow.setBlendMode(Phaser.BlendModes.ADD);
        } else {
            this.glow = null;
        }

        // Thick ring so the ball pops on blue water
        const ringColor = this.friendly ? 0xffe066 : 0xff7799;
        this.ring = scene.add.circle(x, y, 12 * scale, 0xffffff, 0)
            .setStrokeStyle(3, ringColor, 0.9)
            .setDepth(111);
        this.halo = scene.add.circle(x, y, 18 * scale, ringColor, 0.12)
            .setDepth(110);

        this.body.allowGravity = false;
        this.body.setCircle(Math.max(5, this.radius));
        this._setVelocityFromAngle(angle);
        this._angle = angle;

        // Muzzle pop
        this.setAlpha(0.3);
        scene.tweens.add({
            targets: this,
            alpha: 1,
            scale: scale * 1.15,
            duration: 80,
            yoyo: true,
            onComplete: () => {
                if (this.active) this.setScale(scale);
            }
        });
    }

    getX() { return this.x; }
    getY() { return this.y; }

    _setVelocityFromAngle(angle) {
        this._angle = angle;
        this.body.setVelocity(Math.sin(angle) * this.speed, -Math.cos(angle) * this.speed);
        this.setRotation(angle - Math.PI / 2);
    }

    update(_time, delta = 16, seekTarget = null) {
        if (!this._alive || !this.active) return false;
        if (this.scene.time.now - this._born > this.lifeMs) {
            this.destroyBolt();
            return false;
        }

        if (this.seek > 0 && seekTarget) {
            const tx = seekTarget.getX ? seekTarget.getX() : seekTarget.x;
            const ty = seekTarget.getY ? seekTarget.getY() : seekTarget.y;
            if (tx != null && ty != null) {
                const mathAngle = Math.atan2(ty - this.y, tx - this.x);
                const shipAngle = mathAngle + Math.PI / 2;
                const next = Phaser.Math.Angle.RotateTo(this._angle, shipAngle, this.seek);
                this._setVelocityFromAngle(next);
            }
        }

        if (this.glow?.active) {
            this.glow.setPosition(this.x, this.y);
            const pulse = 0.8 + Math.sin(this.scene.time.now * 0.022) * 0.18;
            this.glow.setAlpha(pulse);
            this.glow.setScale((this.scaleX || 1) * (1.45 + pulse * 0.15));
        }
        if (this.ring?.active) {
            this.ring.setPosition(this.x, this.y);
            this.ring.setAlpha(0.55 + Math.sin(this.scene.time.now * 0.028) * 0.25);
        }
        if (this.halo?.active) {
            this.halo.setPosition(this.x, this.y);
            this.halo.setAlpha(0.1 + Math.sin(this.scene.time.now * 0.018) * 0.06);
        }

        // Ember wake — dense enough to read as a streak
        if (this.showTrail) {
            this._trailAcc += delta;
            if (this._trailAcc >= 22) {
                this._trailAcc = 0;
                this._spawnTrail();
            }
        }

        return true;
    }

    _spawnTrail() {
        if (!this.scene || !this.active) return;
        const key = this.scene.textures.exists('boltTrail') ? 'boltTrail' : null;
        const backX = this.x - Math.sin(this._angle) * 12;
        const backY = this.y + Math.cos(this._angle) * 12;
        let puff;
        if (key) {
            puff = this.scene.add.image(backX, backY, key);
            puff.setTint(this.color);
            if (Phaser.BlendModes) puff.setBlendMode(Phaser.BlendModes.ADD);
        } else {
            puff = this.scene.add.circle(backX, backY, 5, this.color, 0.85);
        }
        puff.setDepth(110);
        puff.setScale(1.15);
        this.scene.tweens.add({
            targets: puff,
            alpha: 0,
            scale: 0.15,
            x: backX - Math.sin(this._angle) * 28,
            y: backY + Math.cos(this._angle) * 28,
            duration: 280,
            onComplete: () => puff.destroy()
        });
    }

    destroyBolt() {
        if (!this._alive) return;
        this._alive = false;
        // Brief splash on expire / hit
        if (this.scene) {
            const splash = this.scene.add.circle(this.x, this.y, 8, this.color, 0.95).setDepth(113);
            if (Phaser.BlendModes) splash.setBlendMode(Phaser.BlendModes.ADD);
            this.scene.tweens.add({
                targets: splash,
                scale: 3.4,
                alpha: 0,
                duration: 200,
                onComplete: () => splash.destroy()
            });
        }
        this.destroy();
    }

    destroy(fromScene) {
        this.glow?.destroy();
        this.glow = null;
        this.ring?.destroy();
        this.ring = null;
        this.halo?.destroy();
        this.halo = null;
        super.destroy(fromScene);
    }
}
