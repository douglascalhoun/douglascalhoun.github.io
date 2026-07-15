import Phaser from 'phaser';

/**
 * Lightweight gamepad poller — avoids navigator.getGamepads() every frame
 * until a pad has actually connected (Safari tax).
 */
export default class GamepadControls {
    constructor(scene) {
        this.scene = scene;
        this.deadzone = 0.22;
        this.prev = { fire: false, dock: false, hyperspace: false, map: false };
        this.just = { fire: false, dock: false, hyperspace: false, map: false };
        this._hasSeenPad = false;
        this._empty = Object.freeze({
            rot: 0,
            forward: 0,
            lateral: 0,
            fire: false,
            dock: false,
            hyperspace: false,
            map: false,
            connected: false
        });

        this._onConnect = () => { this._hasSeenPad = true; };
        this._onDisconnect = () => {};

        window.addEventListener('gamepadconnected', this._onConnect);
        window.addEventListener('gamepaddisconnected', this._onDisconnect);

        if (scene.input.gamepad) {
            scene.input.gamepad.once('connected', (pad) => {
                this._hasSeenPad = true;
                scene.showToast?.(`Controller connected: ${pad.id || 'Gamepad'}`, 2400);
            });
        }

        const existing = navigator.getGamepads?.() || [];
        for (let i = 0; i < existing.length; i++) {
            if (existing[i]?.connected) {
                this._hasSeenPad = true;
                break;
            }
        }

        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    }

    destroy() {
        window.removeEventListener('gamepadconnected', this._onConnect);
        window.removeEventListener('gamepaddisconnected', this._onDisconnect);
    }

    _applyDeadzone(v) {
        return Math.abs(v) < this.deadzone ? 0 : v;
    }

    _getPad() {
        const phaserPads = this.scene.input.gamepad?.pads;
        if (phaserPads) {
            for (let i = 0; i < phaserPads.length; i++) {
                const p = phaserPads[i];
                if (p && p.connected) return { kind: 'phaser', pad: p };
            }
        }

        const native = navigator.getGamepads?.() || [];
        for (let i = 0; i < native.length; i++) {
            const g = native[i];
            if (g && g.connected) return { kind: 'native', pad: g };
        }
        return null;
    }

    poll() {
        if (!this._hasSeenPad) return this._empty;

        const found = this._getPad();
        if (!found) {
            this.just = { fire: false, dock: false, hyperspace: false, map: false };
            return this._empty;
        }

        let lx = 0;
        let ly = 0;
        let rx = 0;
        let fire = false;
        let dock = false;
        let hyperspace = false;
        let map = false;

        if (found.kind === 'phaser') {
            const pad = found.pad;
            if (pad.leftStick) {
                lx = pad.leftStick.x;
                ly = pad.leftStick.y;
            } else {
                lx = pad.axes?.[0]?.getValue?.() ?? 0;
                ly = pad.axes?.[1]?.getValue?.() ?? 0;
            }
            if (pad.rightStick) {
                rx = pad.rightStick.x;
            } else {
                rx = pad.axes?.[2]?.getValue?.() ?? 0;
            }

            fire = !!(pad.A || pad.R2 || pad.buttons?.[0]?.pressed || pad.buttons?.[7]?.pressed);
            dock = !!(pad.X || pad.L1 || pad.buttons?.[2]?.pressed || pad.buttons?.[4]?.pressed);
            hyperspace = !!(pad.Y || pad.buttons?.[3]?.pressed);
            map = !!(pad.B || pad.buttons?.[1]?.pressed || pad.buttons?.[8]?.pressed);

            if (pad.left) lx = -1;
            if (pad.right) lx = 1;
            if (pad.up) ly = -1;
            if (pad.down) ly = 1;
        } else {
            const pad = found.pad;
            lx = pad.axes[0] || 0;
            ly = pad.axes[1] || 0;
            rx = pad.axes[2] || 0;
            const btn = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
            fire = btn(0) || btn(7);
            dock = btn(2) || btn(4);
            hyperspace = btn(3);
            map = btn(1) || btn(8);
            if (btn(14)) lx = -1;
            if (btn(15)) lx = 1;
            if (btn(12)) ly = -1;
            if (btn(13)) ly = 1;
        }

        lx = this._applyDeadzone(lx);
        ly = this._applyDeadzone(ly);
        rx = this._applyDeadzone(rx);

        this.just = {
            fire: fire && !this.prev.fire,
            dock: dock && !this.prev.dock,
            hyperspace: hyperspace && !this.prev.hyperspace,
            map: map && !this.prev.map
        };
        this.prev.fire = fire;
        this.prev.dock = dock;
        this.prev.hyperspace = hyperspace;
        this.prev.map = map;

        return {
            rot: lx,
            forward: -ly,
            lateral: rx,
            fire,
            dock,
            hyperspace,
            map,
            connected: true
        };
    }
}
