import Phaser from 'phaser';
import MultiplayerClient, { WORLD_ROOM } from '../net/MultiplayerClient.js';

/**
 * Title lobby — aether archipelago / Age-of-Sail space.
 */
export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    create() {
        this.cameras.main.setBackgroundColor('#061018');
        this.pilotName = localStorage.getItem('spacenova_name') || 'Pilot';
        this.mp = null;

        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        // Soft sea wash
        const wash = this.add.graphics();
        wash.fillStyle(0x0a2030, 1);
        wash.fillRect(0, 0, this.scale.width, this.scale.height);
        for (let i = 0; i < 40; i++) {
            wash.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.15, 0.5));
            wash.fillCircle(
                Phaser.Math.Between(0, this.scale.width),
                Phaser.Math.Between(0, this.scale.height),
                Phaser.Math.FloatBetween(0.6, 1.6)
            );
        }

        this.add.text(cx, 58, 'SPACE NOVA', {
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '44px',
            fill: '#e8dcc0',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(cx, 102, 'Wooden hulls on a sea of stars · islands · harbors · EV Nova deep lanes', {
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            fill: '#88aacc',
            align: 'center',
            wordWrap: { width: Math.min(520, this.scale.width - 40) }
        }).setOrigin(0.5);

        this.nameText = this.add.text(cx, cy - 130, `Captain: ${this.pilotName}`, {
            fontSize: '18px',
            fill: '#e8dcc0',
            backgroundColor: '#1a1208',
            padding: { x: 12, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.nameText.on('pointerdown', () => {
            const next = window.prompt('Captain name', this.pilotName);
            if (next && next.trim()) {
                this.pilotName = next.trim().slice(0, 16);
                localStorage.setItem('spacenova_name', this.pilotName);
                this.nameText.setText(`Captain: ${this.pilotName}`);
            }
        });

        this.makeButton(cx, cy - 50, 'ENTER SOL HAVEN (ONLINE)', () => this.enterSolOnline(), '#2a1e10', '#3d2e18');
        this.makeButton(cx, cy + 20, 'SOLO PRACTICE', () => this.startGame({ mode: 'solo' }), '#0c2030', '#143040');
        this.makeButton(cx, cy + 80, 'PRIVATE SQUADRON', () => this.hostPrivate(), '#1a2030', '#2a3040');

        this.statusText = this.add.text(cx, cy + 150, `Public sea: ${WORLD_ROOM} — drop anchor anytime`, {
            fontSize: '14px',
            fill: '#c9a227',
            align: 'center',
            wordWrap: { width: Math.min(420, this.scale.width - 40) }
        }).setOrigin(0.5);

        this.roomText = this.add.text(cx, cy + 200, '', {
            fontSize: '22px',
            fill: '#e8dcc0',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(cx, this.scale.height - 48, 'Broadsides · gravity wells · hyperspace between islands', {
            fontSize: '12px',
            fill: '#88aacc'
        }).setOrigin(0.5);

        this.add.text(cx, this.scale.height - 28, 'Mouse helm · WASD sail · Q/R batteries · leave the well [H] to jump', {
            fontSize: '11px',
            fill: '#667788'
        }).setOrigin(0.5);
    }

    makeButton(x, y, label, onClick, bg = '#2a1e10', hover = '#3d2e18') {
        const btn = this.add.text(x, y, label, {
            fontFamily: 'Georgia, serif',
            fontSize: '17px',
            fill: '#e8dcc0',
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
        this.setStatus('Sighting other sails on the Sol Haven approaches…');
        this.mp = new MultiplayerClient({
            onStatus: (s) => this.setStatus(s),
            onPeer: () => {},
            onData: () => {},
            onClose: () => this.setStatus('Lost the harbor master signal')
        });
        this.mp.enterWorld(WORLD_ROOM).then(({ mode, roomCode }) => {
            this.roomText.setText(mode === 'host' ? `ANCHOR · ${roomCode}` : `UNDERWAY · ${roomCode}`);
            this.setStatus(mode === 'host'
                ? 'You hold the Sol Anchor — other captains will appear in these waters.'
                : 'Linked to Sol Haven — casting off…');
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
            onPeer: () => this.setStatus('Squadron mate linked — casting off…'),
            onData: () => {},
            onClose: () => this.setStatus('Mate left the squadron')
        });
        this.mp.host().then((code) => {
            this.roomText.setText(code);
            this.setStatus(`Private squadron ${code} — share the code. Casting off…`);
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
