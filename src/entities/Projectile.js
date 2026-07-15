import Phaser from 'phaser';

/**
 * Projectile — laser bolt, seeker, or bomb blast.
 * Angle uses ship convention: 0 = nose up (same as Player).
 */
export default class Projectile extends Phaser.GameObjects.Container {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x
   * @param {number} y
   * @param {number} angle ship-forward radians
   * @param {object|number} optsOrSpeed options, or legacy speed number
   * @param {object} [maybeOpts] legacy options when 5th arg was speed
   */
  constructor(scene, x, y, angle, optsOrSpeed = {}, maybeOpts = null) {
    super(scene, x, y);

    const opts = typeof optsOrSpeed === 'number'
      ? { ...(maybeOpts || {}), speed: optsOrSpeed }
      : (optsOrSpeed || {});

    this.owner = opts.owner || null;
    this.friendly = opts.friendly ?? opts.fromPlayer ?? false;
    this.speed = opts.speed ?? 420;
    this.lifeMs = opts.lifeMs ?? opts.lifetime ?? 900;
    this.damage = opts.damage ?? 1;
    this.color = opts.color ?? 0xffdd66;
    this.seek = typeof opts.seek === 'number' ? opts.seek : (opts.seek ? 0.045 : 0);
    this.blastRadius = opts.blastRadius ?? opts.blast ?? 0;
    this.kind = opts.kind || (this.seek ? 'missile' : this.blastRadius ? 'bomb' : 'laser');
    this.radius = opts.radius ?? 4;

    const lateral = opts.lateral || 0;
    if (lateral) {
      // Ship-right offset
      this.x += Math.cos(angle) * lateral;
      this.y += Math.sin(angle) * lateral;
    }

    const len = this.kind === 'missile' ? 14 : this.kind === 'bomb' ? 10 : (opts.stretch ? 16 : 12);
    const w = this.kind === 'bomb' ? 8 : Math.max(2, this.radius);
    this.bolt = scene.add.rectangle(0, 0, len, w, this.color);
    this.bolt.setStrokeStyle(1, 0xffffff, 0.55);
    this.add(this.bolt);
    this.sprite = this.bolt;

    if (this.kind === 'missile') {
      const tip = scene.add.triangle(0, -8, -3, 0, 3, 0, 0, -10, 0xff8844);
      this.add(tip);
    }

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(Math.max(4, w), -4, -4);
    this.body.allowGravity = false;

    this.setRotation(angle);
    this._setVelocityFromAngle(angle);

    this._born = scene.time.now;
    this._alive = true;
  }

  getX() { return this.x; }
  getY() { return this.y; }

  _setVelocityFromAngle(angle) {
    // Match Player ship-forward: sin / -cos
    this.body.setVelocity(Math.sin(angle) * this.speed, -Math.cos(angle) * this.speed);
  }

  update(_time, _delta, seekTarget = null) {
    if (!this._alive) return false;
    if (!this.scene || !this.active) {
      this._alive = false;
      return false;
    }
    if (this.scene.time.now - this._born > this.lifeMs) {
      this.destroyBolt();
      return false;
    }

    if (this.seek > 0 && seekTarget) {
      const tx = seekTarget.getX ? seekTarget.getX() : seekTarget.x;
      const ty = seekTarget.getY ? seekTarget.getY() : seekTarget.y;
      if (tx != null && ty != null) {
        // Convert world atan2 (math) into ship-forward angle
        const mathAngle = Math.atan2(ty - this.y, tx - this.x);
        const shipAngle = mathAngle + Math.PI / 2;
        const next = Phaser.Math.Angle.RotateTo(this.rotation, shipAngle, this.seek);
        this.setRotation(next);
        this._setVelocityFromAngle(next);
      }
    }
    return true;
  }

  destroyBolt() {
    if (!this._alive) return;
    this._alive = false;
    if (this.active) super.destroy();
  }

  destroy() {
    this._alive = false;
    if (this.active) super.destroy();
  }
}
