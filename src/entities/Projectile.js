import Phaser from 'phaser';

/**
 * Pooled projectile — Image + Arcade body, no Graphics, no Container.
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
        const key = kind === 'missile' ? 'boltMissile' : kind === 'bomb' ? 'boltBomb' : 'boltLaser';

        super(scene, x, y, key);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.owner = opts.owner || null;
        this.friendly = opts.friendly ?? opts.fromPlayer ?? false;
        this.speed = opts.speed ?? 420;
        this.lifeMs = opts.lifeMs ?? opts.lifetime ?? 900;
        this.damage = opts.damage ?? 1;
        this.color = opts.color ?? 0xffdd66;
        this.seek = typeof opts.seek === 'number' ? opts.seek : (opts.seek ? 0.045 : 0);
        this.blastRadius = opts.blastRadius ?? opts.blast ?? 0;
        this.kind = kind;
        this.radius = opts.radius ?? 4;
        this._alive = true;
        this._born = scene.time.now;

        // Back-compat for any code touching .sprite
        this.sprite = this;
        this.bolt = this;

        const lateral = opts.lateral || 0;
        if (lateral) {
            this.x += Math.cos(angle) * lateral;
            this.y += Math.sin(angle) * lateral;
        }

        this.setTint(this.color);
        this.setDepth(110);
        this.setRotation(angle - Math.PI / 2); // texture is axis-aligned; ship angle is nose-up
        if (opts.stretch) this.setScale(1.4, 0.8);

        this.body.allowGravity = false;
        this.body.setCircle(Math.max(3, this.radius));
        this._setVelocityFromAngle(angle);
        this._angle = angle;
    }

    getX() { return this.x; }
    getY() { return this.y; }

    _setVelocityFromAngle(angle) {
        this._angle = angle;
        this.body.setVelocity(Math.sin(angle) * this.speed, -Math.cos(angle) * this.speed);
        this.setRotation(angle - Math.PI / 2);
    }

    update(_time, _delta, seekTarget = null) {
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
        return true;
    }

    destroyBolt() {
        if (!this._alive) return;
        this._alive = false;
        this.destroy();
    }
}
