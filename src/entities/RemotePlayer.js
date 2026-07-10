import Phaser from 'phaser';

/** Visual + interpolated representation of a remote multiplayer ship */
export default class RemotePlayer {
    constructor(scene, info = {}) {
        this.scene = scene;
        this.name = info.name || 'Pilot';
        this.systemId = info.systemId || 'sol';
        this.x = info.x || 0;
        this.y = info.y || 0;
        this.rotation = info.rotation || 0;
        this.shields = info.shields ?? 100;
        this.hull = info.hull ?? 100;
        this.targetX = this.x;
        this.targetY = this.y;
        this.targetRot = this.rotation;
        this.lastUpdate = Date.now();
        this.visibleInSystem = true;

        this.sprite = scene.add.graphics();
        this.draw();
        this.container = scene.add.container(this.x, this.y, [this.sprite]);
        this.container.setDepth(90);

        this.label = scene.add.text(0, -34, this.name, {
            fontSize: '12px',
            fill: '#ffcc66',
            backgroundColor: '#00000088',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(91);
    }

    draw() {
        this.sprite.clear();
        this.sprite.fillStyle(0xffaa33, 1);
        this.sprite.fillTriangle(0, -20, -12, 14, 12, 14);
        this.sprite.fillStyle(0xffffff, 1);
        this.sprite.fillCircle(0, -3, 3);
        this.sprite.lineStyle(2, 0x663300, 1);
        this.sprite.strokeTriangle(0, -20, -12, 14, 12, 14);
    }

    applyState(state) {
        this.targetX = state.x;
        this.targetY = state.y;
        this.targetRot = state.rotation;
        this.systemId = state.systemId || this.systemId;
        this.name = state.name || this.name;
        this.shields = state.shields ?? this.shields;
        this.hull = state.hull ?? this.hull;
        this.label.setText(this.name);
        this.lastUpdate = Date.now();
        this.setInSystem(state.systemId === this.scene.currentSystemId);
    }

    setInSystem(yes) {
        this.visibleInSystem = yes;
        this.container.setVisible(yes);
        this.label.setVisible(yes);
    }

    update(delta) {
        if (!this.visibleInSystem) return;
        const t = Math.min(1, (delta / 1000) * 12);
        this.x = Phaser.Math.Linear(this.x, this.targetX, t);
        this.y = Phaser.Math.Linear(this.y, this.targetY, t);
        this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, this.targetRot, 0.35);
        this.container.setPosition(this.x, this.y);
        this.container.setRotation(this.rotation);
        this.label.setPosition(this.x, this.y - 34);

        // Stale remote player fades
        if (Date.now() - this.lastUpdate > 4000) {
            this.container.setAlpha(0.35);
        } else {
            this.container.setAlpha(1);
        }
    }

    destroy() {
        this.container.destroy();
        this.label.destroy();
    }
}
