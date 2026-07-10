/**
 * Xbox / generic gamepad reader (Browser Gamepad API + Phaser pads).
 *
 * Default layout (Xbox):
 * - Left stick X  → turn
 * - Left stick Y  → thrust (up = forward)
 * - Right stick X → strafe
 * - A or RT       → fire
 * - X or LB       → dock
 * - Y             → hyperspace
 * - B or View     → galaxy map
 */
export default class GamepadControls {
    constructor(scene) {
        this.scene = scene;
        this.deadzone = 0.22;
        this.prev = {
            fire: false,
            dock: false,
            hyperspace: false,
            map: false
        };
        this.just = {
            fire: false,
            dock: false,
            hyperspace: false,
            map: false
        };

        // Prefer Phaser gamepad plugin when available
        if (scene.input.gamepad) {
            scene.input.gamepad.once('connected', (pad) => {
                scene.showToast?.(`Controller connected: ${pad.id || 'Gamepad'}`, 2400);
            });
        }
    }

    _applyDeadzone(v) {
        return Math.abs(v) < this.deadzone ? 0 : v;
    }

    _getPad() {
        // Phaser pads
        const phaserPads = this.scene.input.gamepad?.pads?.filter((p) => p && p.connected) || [];
        if (phaserPads.length) return { kind: 'phaser', pad: phaserPads[0] };

        // Native Gamepad API fallback (works well with Bluetooth Xbox on desktop)
        const native = (navigator.getGamepads ? navigator.getGamepads() : []) || [];
        for (const g of native) {
            if (g && g.connected) return { kind: 'native', pad: g };
        }
        return null;
    }

    /**
     * @returns {{rot:number, forward:number, lateral:number, fire:boolean, dock:boolean, hyperspace:boolean, map:boolean, connected:boolean}}
     */
    poll() {
        const found = this._getPad();
        const empty = {
            rot: 0,
            forward: 0,
            lateral: 0,
            fire: false,
            dock: false,
            hyperspace: false,
            map: false,
            connected: false
        };
        if (!found) {
            this.just = { fire: false, dock: false, hyperspace: false, map: false };
            this.prev = { fire: false, dock: false, hyperspace: false, map: false };
            return empty;
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

            // Phaser Xbox buttons: A=0, B=1, X=2, Y=3, LB=4, RB=5, LT=6, RT=7, view=8, menu=9
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
            fire = btn(0) || btn(7); // A or RT
            dock = btn(2) || btn(4); // X or LB
            hyperspace = btn(3); // Y
            map = btn(1) || btn(8); // B or View
            // D-pad (buttons 12-15 on standard mapping)
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
        this.prev = { fire, dock, hyperspace, map };

        return {
            // left stick X = turn (same sense as A/D)
            rot: lx,
            // left stick up (negative Y) = forward
            forward: -ly,
            // right stick X = strafe
            lateral: rx,
            fire,
            dock,
            hyperspace,
            map,
            connected: true
        };
    }
}
