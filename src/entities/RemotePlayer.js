import Phaser from 'phaser';

/** Visual + interpolated representation of a remote multiplayer ship */
export default class RemotePlayer {
    constructor(scene, info = {}) {
        this.scene = scene;
        this.id = info.id || info.fromId || info.name || `pilot-${Math.random().toString(36).slice(2, 7)}`;
        this.name = info.name || 'Pilot';
        this.systemId = info.systemId || 'sol';
        this.power = info.power ?? 1;
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

        this.sprite = scene.add.image(0, 0, 'shipRemote');
        this.sprite.setTint(this._tintFromId(this.id));
        this.container = scene.add.container(this.x, this.y, [this.sprite]);
        this.container.setDepth(90);

        this.label = scene.add.text(0, -34, this._labelText(), {
            fontSize: '11px',
            fill: '#ffcc66',
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5).setDepth(91);
    }

    _tintFromId(id) {
        let h = 0;
        const s = String(id);
        for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
        const palette = [0xffaa33, 0x66ccff, 0xff66aa, 0xaaff66, 0xcc88ff, 0xff8866];
        return palette[h % palette.length];
    }

    _labelText() {
        return `${this.name} · P${Math.round(this.power)}`;
    }

    applyState(state) {
        if (state.x != null) this.targetX = state.x;
        if (state.y != null) this.targetY = state.y;
        if (state.rotation != null) this.targetRot = state.rotation;
        this.systemId = state.systemId || this.systemId;
        this.name = state.name || this.name;
        this.power = state.power ?? this.power;
        this.shields = state.shields ?? this.shields;
        this.hull = state.hull ?? this.hull;
        if (state.fromId) this.id = state.fromId;
        this.label.setText(this._labelText());
        this.lastUpdate = Date.now();
        // Continuous archipelago — all pilots share one sea
        this.setInSystem(true);
    }

    setInSystem(yes) {
        this.visibleInSystem = yes !== false;
        this.container.setVisible(this.visibleInSystem);
        this.label.setVisible(this.visibleInSystem);
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
