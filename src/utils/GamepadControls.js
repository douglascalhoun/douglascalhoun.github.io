import Phaser from 'phaser';

/**
 * Helm + gun aim gamepad:
 * - Left stick X → turn · Y → thrust / reverse
 * - Right stick  → gun aim (clamped out of rear quadrant)
 * - A / RT       → side volley toward aim
 * - LB / LS      → sheer (dodge)
 * - X            → dock
 * - Y            → hyperspace
 * - B            → map
 */
export default class GamepadControls {
    constructor(scene) {
        this.scene = scene;
        this.deadzone = 0.22;
        this.prev = { fire: false, dock: false, hyperspace: false, map: false, boost: false };
        this.just = { fire: false, dock: false, hyperspace: false, map: false, boost: false };
        this._hasSeenPad = false;
        this._empty = Object.freeze({
            forward: 0,
            lateral: 0,
            fire: false,
            dock: false,
            hyperspace: false,
            map: false,
            boost: false,
            hasAim: false,
            aimAngle: 0,
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
            this.just = { fire: false, dock: false, hyperspace: false, map: false, boost: false };
            return this._empty;
        }

        let lx = 0;
        let ly = 0;
        let rx = 0;
        let ry = 0;
        let fire = false;
        let dock = false;
        let hyperspace = false;
        let map = false;
        let boost = false;

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
                ry = pad.rightStick.y;
            } else {
                rx = pad.axes?.[2]?.getValue?.() ?? 0;
                ry = pad.axes?.[3]?.getValue?.() ?? 0;
            }

            fire = !!(pad.A || pad.R2 || pad.buttons?.[0]?.pressed || pad.buttons?.[7]?.pressed);
            dock = !!(pad.X || pad.buttons?.[2]?.pressed);
            hyperspace = !!(pad.Y || pad.buttons?.[3]?.pressed);
            map = !!(pad.B || pad.buttons?.[1]?.pressed || pad.buttons?.[8]?.pressed);
            boost = !!(pad.L1 || pad.L3 || pad.buttons?.[4]?.pressed || pad.buttons?.[10]?.pressed);

            if (pad.left) lx = -1;
            if (pad.right) lx = 1;
            if (pad.up) ly = -1;
            if (pad.down) ly = 1;
        } else {
            const pad = found.pad;
            lx = pad.axes[0] || 0;
            ly = pad.axes[1] || 0;
            rx = pad.axes[2] || 0;
            ry = pad.axes[3] || 0;
            const btn = (i) => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
            fire = btn(0) || btn(7);
            dock = btn(2);
            hyperspace = btn(3);
            map = btn(1) || btn(8);
            boost = btn(4) || btn(10);
            if (btn(14)) lx = -1;
            if (btn(15)) lx = 1;
            if (btn(12)) ly = -1;
            if (btn(13)) ly = 1;
        }

        lx = this._applyDeadzone(lx);
        ly = this._applyDeadzone(ly);
        rx = this._applyDeadzone(rx);
        ry = this._applyDeadzone(ry);

        const aimMag = Math.hypot(rx, ry);
        const hasAim = aimMag > 0.35;
        // Stick: 0=right in math; ship forward 0=up → aimAngle = atan2(rx, -ry)
        const aimAngle = hasAim ? Math.atan2(rx, -ry) : 0;

        this.just = {
            fire: fire && !this.prev.fire,
            dock: dock && !this.prev.dock,
            hyperspace: hyperspace && !this.prev.hyperspace,
            map: map && !this.prev.map,
            boost: boost && !this.prev.boost
        };
        this.prev = { fire, dock, hyperspace, map, boost };

        return {
            // Left stick: X = turn, Y = thrust (EV Nova)
            forward: -ly,
            turn: lx,
            lateral: lx,
            fire,
            dock,
            hyperspace,
            map,
            boost,
            hasAim,
            aimAngle,
            connected: true
        };
    }
}
