import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.WEBGL,
    parent: 'game',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#0a3a62',
    input: {
        gamepad: true
    },
    // Safari (macOS/iOS) is very sensitive to GL batch size + antialias
    render: {
        antialias: false,
        antialiasGL: false,
        batchSize: 512,
        roundPixels: true,
        powerPreference: 'high-performance',
        pixelArt: false,
        transparent: false
    },
    fps: {
        target: 60,
        forceSetTimeOut: false
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false,
            fps: 60,
            timeScale: 1,
            // Fewer body syncs — we drive ships via velocity/accel ourselves
            overlapBias: 4
        }
    },
    scene: [GameScene],
    banner: false
};

const game = new Phaser.Game(config);

// Scale.RESIZE already handles viewport changes — avoid a second resize thrash on Safari
window.addEventListener('gamepadconnected', (e) => {
    console.log('Gamepad connected', e.gamepad?.id);
});

export default game;
