import Phaser from 'phaser';
import MultiplayerClient from '../net/MultiplayerClient.js';

/**
 * Title / multiplayer lobby.
 * Solo play, host a room, or join with a code.
 */
export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#02080f');
        this.pilotName = localStorage.getItem('spacenova_name') || 'Pilot';
        this.status = '';
        this.mp = null;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add.text(cx, 70, 'SPACE NOVA', {
            fontSize: '42px',
            fill: '#9dffb0',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(cx, 115, 'Simplified Escape Velocity — co-op multiplayer', {
            fontSize: '14px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        this.nameText = this.add.text(cx, cy - 120, `Pilot: ${this.pilotName}`, {
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: '#123322',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.nameText.on('pointerdown', () => {
            const next = window.prompt('Pilot name', this.pilotName);
            if (next && next.trim()) {
                this.pilotName = next.trim().slice(0, 16);
                localStorage.setItem('spacenova_name', this.pilotName);
                this.nameText.setText(`Pilot: ${this.pilotName}`);
            }
        });

        this.makeButton(cx, cy - 40, 'SOLO FLIGHT', () => this.startGame({ mode: 'solo' }));
        this.makeButton(cx, cy + 20, 'HOST CO-OP ROOM', () => this.hostRoom());
        this.makeButton(cx, cy + 80, 'JOIN ROOM', () => this.joinRoom());

        this.statusText = this.add.text(cx, cy + 150, 'Share a room code with your friend to fly together.', {
            fontSize: '14px',
            fill: '#c8ffd8',
            align: 'center',
            wordWrap: { width: Math.min(420, this.scale.width - 40) }
        }).setOrigin(0.5);

        this.roomText = this.add.text(cx, cy + 200, '', {
            fontSize: '28px',
            fill: '#ffdd66',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(cx, this.scale.height - 48, 'Keyboard · Xbox controller · Touch (phones)', {
            fontSize: '12px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        this.add.text(cx, this.scale.height - 28, 'Mouse aim · WASD strafe/thrust · Shift dodge · Space fire  ·  Xbox: LS move RS aim', {
            fontSize: '11px',
            fill: '#667788'
        }).setOrigin(0.5);
    }

    makeButton(x, y, label, onClick) {
        const btn = this.add.text(x, y, label, {
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: '#1a4d33',
            padding: { x: 18, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#2a6d4a' }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#1a4d33' }));
        btn.on('pointerdown', onClick);
        return btn;
    }

    setStatus(msg) {
        this.status = msg;
        this.statusText.setText(msg);
    }

    hostRoom() {
        this.cleanupMp();
        this.mp = new MultiplayerClient({
            onStatus: (s) => this.setStatus(s),
            onPeer: () => this.setStatus('Friend connected — launching…'),
            onData: () => {},
            onClose: () => this.setStatus('Friend left the lobby')
        });
        this.mp.host().then((code) => {
            this.roomText.setText(code);
            this.setStatus(`Room ready. Friend joins with code ${code}. Launching your ship…`);
            this.time.delayedCall(600, () => {
                this.startGame({ mode: 'host', roomCode: code, mp: this.mp });
            });
        }).catch((err) => {
            this.setStatus(`Could not host: ${err.message || err}`);
        });
    }

    joinRoom() {
        const code = window.prompt('Enter room code (e.g. NOVA7K2Q)');
        if (!code) return;
        this.cleanupMp();
        this.mp = new MultiplayerClient({
            onStatus: (s) => this.setStatus(s),
            onPeer: () => {},
            onData: () => {},
            onClose: () => this.setStatus('Disconnected from host')
        });
        this.setStatus(`Connecting to ${code.toUpperCase()}…`);
        this.mp.join(code).then((joined) => {
            this.roomText.setText(joined);
            this.startGame({ mode: 'guest', roomCode: joined, mp: this.mp });
        }).catch((err) => {
            this.setStatus(`Join failed: ${err.message || err}. Check the code and that host is online.`);
        });
    }

    startGame(opts) {
        this.scene.start('GameScene', {
            mode: opts.mode,
            roomCode: opts.roomCode || null,
            mp: opts.mp || null,
            pilotName: this.pilotName
        });
    }

    cleanupMp() {
        if (this.mp) {
            // Don't destroy if we're about to hand it to GameScene
        }
    }
}
