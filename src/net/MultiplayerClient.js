import Peer from 'peerjs';

/**
 * Lightweight PeerJS multiplayer client.
 * Host creates a short room code; guest joins with that code.
 */
export default class MultiplayerClient {
    constructor({ onPeer, onData, onStatus, onClose }) {
        this.onPeer = onPeer;
        this.onData = onData;
        this.onStatus = onStatus;
        this.onClose = onClose;
        this.peer = null;
        this.conn = null;
        this.isHost = false;
        this.roomCode = null;
        this.ready = false;
    }

    static makeRoomCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = 'NOVA';
        for (let i = 0; i < 4; i++) {
            code += alphabet[Math.floor(Math.random() * alphabet.length)];
        }
        return code;
    }

    _peerId(code) {
        return `spacenova-${code.toLowerCase()}`;
    }

    host(roomCode = MultiplayerClient.makeRoomCode()) {
        this.isHost = true;
        this.roomCode = roomCode.toUpperCase();
        this._status(`Hosting room ${this.roomCode}…`);
        return this._openPeer(this._peerId(this.roomCode)).then(() => {
            this.peer.on('connection', (conn) => this._bindConnection(conn));
            this._status(`Room ${this.roomCode} ready — share this code`);
            this.ready = true;
            return this.roomCode;
        });
    }

    join(roomCode) {
        this.isHost = false;
        this.roomCode = roomCode.toUpperCase().trim();
        this._status(`Joining ${this.roomCode}…`);
        return this._openPeer().then(() => new Promise((resolve, reject) => {
            const conn = this.peer.connect(this._peerId(this.roomCode), { reliable: true });
            const timer = setTimeout(() => reject(new Error('Join timed out')), 12000);
            conn.on('open', () => {
                clearTimeout(timer);
                this._bindConnection(conn);
                this.ready = true;
                this._status(`Joined room ${this.roomCode}`);
                resolve(this.roomCode);
            });
            conn.on('error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        }));
    }

    _openPeer(id) {
        return new Promise((resolve, reject) => {
            this.peer = id ? new Peer(id) : new Peer();
            const timer = setTimeout(() => reject(new Error('PeerJS connection timed out')), 12000);
            this.peer.on('open', (assigned) => {
                clearTimeout(timer);
                resolve(assigned);
            });
            this.peer.on('error', (err) => {
                clearTimeout(timer);
                this._status(`Network error: ${err.type || err.message}`);
                reject(err);
            });
        });
    }

    _bindConnection(conn) {
        if (this.conn && this.conn.open) {
            try { conn.close(); } catch (_) { /* ignore */ }
            return;
        }
        this.conn = conn;
        conn.on('data', (data) => {
            if (this.onData) this.onData(data);
        });
        conn.on('close', () => {
            this.ready = false;
            this._status('Friend disconnected');
            if (this.onClose) this.onClose();
        });
        conn.on('open', () => {
            this.ready = true;
            this._status(this.isHost ? 'Friend connected!' : `Connected to ${this.roomCode}`);
            if (this.onPeer) this.onPeer({ isHost: this.isHost, roomCode: this.roomCode });
        });
        if (conn.open && this.onPeer) {
            this.ready = true;
            this.onPeer({ isHost: this.isHost, roomCode: this.roomCode });
        }
    }

    send(data) {
        if (this.conn && this.conn.open) {
            try {
                this.conn.send(data);
            } catch (_) {
                /* ignore transient send errors */
            }
        }
    }

    _status(msg) {
        if (this.onStatus) this.onStatus(msg);
    }

    destroy() {
        try { this.conn?.close(); } catch (_) { /* ignore */ }
        try { this.peer?.destroy(); } catch (_) { /* ignore */ }
        this.conn = null;
        this.peer = null;
        this.ready = false;
    }
}
