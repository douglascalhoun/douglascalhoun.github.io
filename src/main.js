import Phaser from 'phaser';
import GameScene from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game',
    scale: {
        mode: Phaser.Scale.RESIZE,
        width: window.innerWidth,
        height: window.innerHeight,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
