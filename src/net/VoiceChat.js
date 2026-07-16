/**
 * PeerJS media voice chat for the shared archipelago.
 * Mute by default; user gesture enables mic (browser policy).
 */
export default class VoiceChat {
    /**
     * @param {import('./MultiplayerClient.js').default} mp
     * @param {{ onStatus?: (msg: string) => void }} [opts]
     */
    constructor(mp, opts = {}) {
        this.mp = mp;
        this.onStatus = opts.onStatus || (() => {});
        this.enabled = false;
        this.muted = true;
        this.localStream = null;
        this.calls = new Map(); // peerId -> MediaConnection
        this.audioEls = new Map(); // peerId -> HTMLAudioElement
        this._callHandler = null;
    }

    async enable() {
        if (!this.mp?.peer) {
            this.onStatus('Voice: not connected yet');
            return false;
        }
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
        } catch (err) {
            this.onStatus('Voice: mic denied — check browser permissions');
            return false;
        }

        this.enabled = true;
        this.muted = false;
        this._setTrackEnabled(true);
        this._listenForCalls();
        this._callAllPeers();
        this.onStatus('Voice ON — crew can hear you');
        return true;
    }

    async toggle() {
        if (!this.enabled) return this.enable();
        this.muted = !this.muted;
        this._setTrackEnabled(!this.muted);
        this.onStatus(this.muted ? 'Voice muted' : 'Voice live');
        return !this.muted;
    }

    _setTrackEnabled(on) {
        if (!this.localStream) return;
        for (const t of this.localStream.getAudioTracks()) t.enabled = on;
    }

    _listenForCalls() {
        if (!this.mp.peer || this._callHandler) return;
        this._callHandler = (call) => {
            if (!this.localStream) {
                try { call.close(); } catch (_) { /* ignore */ }
                return;
            }
            call.answer(this.localStream);
            this._bindCall(call);
        };
        this.mp.peer.on('call', this._callHandler);
    }

    _callAllPeers() {
        if (!this.mp?.peer || !this.localStream) return;
        for (const peerId of this.mp.conns.keys()) {
            this._callPeer(peerId);
        }
    }

    /** Call a newly joined pilot if voice is already on. */
    onPeerJoined(peerId) {
        if (!this.enabled || !this.localStream || this.muted) return;
        this._callPeer(peerId);
    }

    _callPeer(peerId) {
        if (!this.mp?.peer || !this.localStream) return;
        if (this.calls.has(peerId)) return;
        try {
            const call = this.mp.peer.call(peerId, this.localStream, {
                metadata: { kind: 'voice' }
            });
            if (call) this._bindCall(call);
        } catch (_) {
            /* ignore — peer may not support media yet */
        }
    }

    _bindCall(call) {
        const peerId = call.peer;
        if (this.calls.has(peerId)) {
            try { call.close(); } catch (_) { /* ignore */ }
            return;
        }
        this.calls.set(peerId, call);

        call.on('stream', (remoteStream) => {
            let el = this.audioEls.get(peerId);
            if (!el) {
                el = document.createElement('audio');
                el.autoplay = true;
                el.playsInline = true;
                el.style.display = 'none';
                document.body.appendChild(el);
                this.audioEls.set(peerId, el);
            }
            el.srcObject = remoteStream;
            el.play().catch(() => {});
        });

        call.on('close', () => this._dropPeer(peerId));
        call.on('error', () => this._dropPeer(peerId));
    }

    _dropPeer(peerId) {
        const call = this.calls.get(peerId);
        if (call) {
            try { call.close(); } catch (_) { /* ignore */ }
            this.calls.delete(peerId);
        }
        const el = this.audioEls.get(peerId);
        if (el) {
            try { el.srcObject = null; el.remove(); } catch (_) { /* ignore */ }
            this.audioEls.delete(peerId);
        }
    }

    onPeerLeft(peerId) {
        this._dropPeer(peerId);
    }

    statusLabel() {
        if (!this.enabled) return 'Voice: OFF [V]';
        return this.muted ? 'Voice: MUTED [V]' : 'Voice: LIVE [V]';
    }

    destroy() {
        for (const id of [...this.calls.keys()]) this._dropPeer(id);
        if (this.localStream) {
            for (const t of this.localStream.getTracks()) t.stop();
            this.localStream = null;
        }
        if (this.mp?.peer && this._callHandler) {
            try { this.mp.peer.off('call', this._callHandler); } catch (_) { /* ignore */ }
        }
        this._callHandler = null;
        this.enabled = false;
    }
}
