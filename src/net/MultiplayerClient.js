import Peer from 'peerjs';

/**
 * Shared-world PeerJS client (star topology).
 * First pilot to claim the world peer-id becomes the Anchor (host) and relays
 * traffic so everyone shares one Sol instance.
 *
 * Not a true dedicated MMO server — PeerJS cloud + browser host — but gives
 * a persistent public solar system by default without backend infra.
 */
export const WORLD_ROOM = 'SOLARIS';
export const MAX_PILOTS = 16;

export default class MultiplayerClient {
    constructor({ onPeer, onData, onStatus, onClose, onPeerLeave } = {}) {
        this.onPeer = onPeer;
        this.onData = onData;
        this.onStatus = onStatus;
        this.onClose = onClose;
        this.onPeerLeave = onPeerLeave;

        this.peer = null;
        this.conns = new Map(); // peerId -> DataConnection
        this.isHost = false;
        this.roomCode = null;
        this.ready = false;
        this.localId = null;
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
        return `spacenova-${String(code).toLowerCase()}`;
    }

    /**
     * Join the public Sol world — become guest if Anchor exists, else host it.
     */
    async enterWorld(roomCode = WORLD_ROOM) {
        const code = String(roomCode).toUpperCase();
        this._status(`Entering ${code}…`);

        // Try join first (most common path when world is live)
        try {
            await this.join(code, 3500);
            return { mode: 'guest', roomCode: code };
        } catch (_) {
            /* fall through to host */
        }

        // Claim Anchor seat
        try {
            await this.host(code);
            return { mode: 'host', roomCode: code };
        } catch (hostErr) {
            // Race: someone else claimed it mid-flight — join again
            await this.destroy();
            await this.join(code, 8000);
            return { mode: 'guest', roomCode: code };
        }
    }

    host(roomCode = MultiplayerClient.makeRoomCode()) {
        this.isHost = true;
        this.roomCode = String(roomCode).toUpperCase();
        this._status(`Anchoring world ${this.roomCode}…`);
        return this._openPeer(this._peerId(this.roomCode)).then(() => {
            this.peer.on('connection', (conn) => this._bindConnection(conn));
            this._status(`World ${this.roomCode} online — pilots can drop in`);
            this.ready = true;
            return this.roomCode;
        });
    }

    join(roomCode, timeoutMs = 12000) {
        this.isHost = false;
        this.roomCode = String(roomCode).toUpperCase().trim();
        this._status(`Joining ${this.roomCode}…`);
        return this._openPeer().then(() => new Promise((resolve, reject) => {
            const conn = this.peer.connect(this._peerId(this.roomCode), { reliable: true });
            const timer = setTimeout(() => {
                try { conn.close(); } catch (_) { /* ignore */ }
                reject(new Error('Join timed out'));
            }, timeoutMs);
            conn.on('open', () => {
                clearTimeout(timer);
                this._bindConnection(conn);
                this.ready = true;
                this._status(`Aboard ${this.roomCode}`);
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
            try { this.peer?.destroy(); } catch (_) { /* ignore */ }
            this.peer = id ? new Peer(id) : new Peer();
            const timer = setTimeout(() => reject(new Error('PeerJS connection timed out')), 12000);
            this.peer.on('open', (assigned) => {
                clearTimeout(timer);
                this.localId = assigned;
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
        const remoteId = conn.peer;
        if (this.conns.has(remoteId)) {
            try { conn.close(); } catch (_) { /* ignore */ }
            return;
        }
        if (this.conns.size >= MAX_PILOTS - 1) {
            this._status('World full — try again shortly');
            try { conn.close(); } catch (_) { /* ignore */ }
            return;
        }

        this.conns.set(remoteId, conn);

        conn.on('data', (data) => {
            const envelope = this._normalize(data, remoteId);
            if (this.isHost) {
                // Relay to everyone else
                this._relay(envelope, remoteId);
            }
            if (this.onData) this.onData(envelope);
        });

        conn.on('close', () => {
            this.conns.delete(remoteId);
            if (this.onPeerLeave) this.onPeerLeave(remoteId);
            if (!this.isHost) {
                this.ready = false;
                this._status('World Anchor disconnected');
                if (this.onClose) this.onClose({ reason: 'anchor_left' });
            } else {
                this._status(`Pilot left · ${this.pilotCount()} in system`);
            }
        });

        const announce = () => {
            this.ready = true;
            this._status(this.isHost
                ? `Pilot linked · ${this.pilotCount()} in system`
                : `Connected to ${this.roomCode}`);
            if (this.onPeer) {
                this.onPeer({
                    isHost: this.isHost,
                    roomCode: this.roomCode,
                    peerId: remoteId,
                    pilotCount: this.pilotCount()
                });
            }
        };

        conn.on('open', announce);
        if (conn.open) announce();
    }

    _normalize(data, fromId) {
        if (!data || typeof data !== 'object') return data;
        return {
            ...data,
            fromId: data.fromId || fromId,
            _via: this.isHost ? 'anchor' : 'peer'
        };
    }

    _relay(envelope, exceptId) {
        for (const [id, conn] of this.conns) {
            if (id === exceptId) continue;
            if (!conn.open) continue;
            try { conn.send(envelope); } catch (_) { /* ignore */ }
        }
    }

    pilotCount() {
        // Local + remotes
        return 1 + this.conns.size;
    }

    send(data) {
        if (!data || typeof data !== 'object') return;
        const envelope = {
            ...data,
            fromId: this.localId || data.fromId,
            sentAt: Date.now()
        };

        if (this.isHost) {
            // Host broadcasts to all guests
            for (const conn of this.conns.values()) {
                if (!conn.open) continue;
                try { conn.send(envelope); } catch (_) { /* ignore */ }
            }
            return;
        }

        // Guest → host only (host relays)
        const [conn] = this.conns.values();
        if (conn && conn.open) {
            try { conn.send(envelope); } catch (_) { /* ignore */ }
        }
    }

    _status(msg) {
        if (this.onStatus) this.onStatus(msg);
    }

    async destroy() {
        for (const conn of this.conns.values()) {
            try { conn.close(); } catch (_) { /* ignore */ }
        }
        this.conns.clear();
        try { this.peer?.destroy(); } catch (_) { /* ignore */ }
        this.peer = null;
        this.ready = false;
        this.localId = null;
    }
}
