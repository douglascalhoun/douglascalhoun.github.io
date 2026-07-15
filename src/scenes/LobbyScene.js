import Phaser from 'phaser';
import MultiplayerClient, { WORLD_ROOM } from '../net/MultiplayerClient.js';

/**
 * Title lobby — Sol Online is the default path.
 */
export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#02080f');
        this.pilotName = localStorage.getItem('spacenova_name') || 'Pilot';
        this.mp = null;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add.text(cx, 64, 'SPACE NOVA', {
            fontSize: '42px',
            fill: '#9dffb0',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(cx, 108, 'One shared solar system · naval broadsides · fleet-scaled raids', {
            fontSize: '14px',
            fill: '#88aa99',
            align: 'center',
            wordWrap: { width: Math.min(480, this.scale.width - 40) }
        }).setOrigin(0.5);

        this.nameText = this.add.text(cx, cy - 130, `Pilot: ${this.pilotName}`, {
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

        this.makeButton(cx, cy - 50, 'ENTER SOL ONLINE', () => this.enterSolOnline(), '#1a5a3a', '#2a7a52');
        this.makeButton(cx, cy + 20, 'SOLO PRACTICE', () => this.startGame({ mode: 'solo' }), '#1a3344', '#2a4a5a');
        this.makeButton(cx, cy + 80, 'PRIVATE ROOM', () => this.hostPrivate(), '#333322', '#555533');

        this.statusText = this.add.text(cx, cy + 150, `Public world: ${WORLD_ROOM} — drop in anytime`, {
            fontSize: '14px',
            fill: '#c8ffd8',
            align: 'center',
            wordWrap: { width: Math.min(420, this.scale.width - 40) }
        }).setOrigin(0.5);

        this.roomText = this.add.text(cx, cy + 200, '', {
            fontSize: '22px',
            fill: '#ffdd66',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(cx, this.scale.height - 48, 'Everyone shares Sol · raids scale to who\'s online', {
            fontSize: '12px',
            fill: '#88aa99'
        }).setOrigin(0.5);

        this.add.text(cx, this.scale.height - 28, 'Mouse helm · WASD sail · Q/R broadsides · Space volley', {
            fontSize: '11px',
            fill: '#667788'
        }).setOrigin(0.5);
    }

    makeButton(x, y, label, onClick, bg = '#1a4d33', hover = '#2a6d4a') {
        const btn = this.add.text(x, y, label, {
            fontSize: '18px',
            fill: '#ffffff',
            backgroundColor: bg,
            padding: { x: 18, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => btn.setStyle({ backgroundColor: hover }));
        btn.on('pointerout', () => btn.setStyle({ backgroundColor: bg }));
        btn.on('pointerdown', onClick);
        return btn;
    }

    setStatus(msg) {
        this.statusText.setText(msg);
    }

    enterSolOnline() {
        this.setStatus('Finding Sol traffic…');
        this.mp = new MultiplayerClient({
            onStatus: (s) => this.setStatus(s),
            onPeer: () => {},
            onData: () => {},
            onClose: () => this.setStatus('Disconnected from Sol Anchor')
        });
        this.mp.enterWorld(WORLD_ROOM).then(({ mode, roomCode }) => {
            this.roomText.setText(mode === 'host' ? `ANCHOR · ${roomCode}` : `ONLINE · ${roomCode}`);
            this.setStatus(mode === 'host'
                ? 'You are the Sol Anchor — other pilots will appear here.'
                : 'Linked to Sol — launching…');
            this.time.delayedCall(400, () => {
                this.startGame({ mode, roomCode, mp: this.mp, online: true });
            });
        }).catch((err) => {
            this.setStatus(`Could not enter Sol: ${err.message || err}`);
        });
    }

    hostPrivate() {
        this.mp = new MultiplayerClient({
            onStatus: (s) => this.setStatus(s),
            onPeer: () => this.setStatus('Pilot linked — launching…'),
            onData: () => {},
            onClose: () => this.setStatus('Friend left')
        });
        this.mp.host().then((code) => {
            this.roomText.setText(code);
            this.setStatus(`Private room ${code} — share the code. Launching…`);
            this.time.delayedCall(500, () => {
                this.startGame({ mode: 'host', roomCode: code, mp: this.mp, online: true });
            });
        }).catch((err) => {
            this.setStatus(`Could not host: ${err.message || err}`);
        });
    }

    startGame(opts) {
        this.scene.start('GameScene', {
            mode: opts.mode,
            roomCode: opts.roomCode || null,
            mp: opts.mp || null,
            pilotName: this.pilotName,
            online: Boolean(opts.online)
        });
    }
}
