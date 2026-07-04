export default class Station {
    constructor(scene, x, y, name = "Station Alpha") {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.name = name;
        this.dockingRadius = 200;
        
        // Create station sprite
        this.createStationGraphics();
    }
    
    createStationGraphics() {
        // Main station container
        this.container = this.scene.add.container(this.x, this.y);
        
        // Station structure - simple rectangular design
        const station = this.scene.add.graphics();
        
        // Central hub
        station.fillStyle(0x888888, 1);
        station.fillRect(-30, -30, 60, 60);
        
        // Docking arms
        station.fillStyle(0x666666, 1);
        station.fillRect(-60, -10, 30, 20);  // Left arm
        station.fillRect(30, -10, 30, 20);   // Right arm
        station.fillRect(-10, -60, 20, 30);  // Top arm
        station.fillRect(-10, 30, 20, 30);   // Bottom arm
        
        // Details/windows
        station.fillStyle(0xffff00, 0.8);
        station.fillCircle(0, 0, 8);  // Central light
        station.fillCircle(-45, 0, 4);  // Left light
        station.fillCircle(45, 0, 4);   // Right light
        
        // Add to container
        this.container.add(station);
        
        // Docking zone indicator (only shows when near)
        this.dockingZone = this.scene.add.circle(this.x, this.y, this.dockingRadius, 0x00ff00, 0);
        this.dockingZone.setStrokeStyle(2, 0x00ff00, 0.3);
        this.dockingZone.setDepth(-30);
        
        // Station label
        this.label = this.scene.add.text(this.x, this.y - 80, this.name, {
            fontSize: '16px',
            fill: '#00ff00',
            backgroundColor: '#000000',
            padding: { x: 8, y: 4 }
        });
        this.label.setOrigin(0.5);
        this.label.setAlpha(0);
        this.label.setDepth(100);
    }
    
    update(playerX, playerY) {
        const distance = Phaser.Math.Distance.Between(playerX, playerY, this.x, this.y);
        const inDockingRange = distance < this.dockingRadius;
        
        // Show docking zone and label when in range
        if (inDockingRange) {
            this.dockingZone.setAlpha(0.3);
            this.label.setAlpha(1);
        } else {
            this.dockingZone.setAlpha(0);
            this.label.setAlpha(Math.max(0, 1 - (distance - this.dockingRadius) / 500));
        }
        
        return inDockingRange;
    }
    
    getX() {
        return this.x;
    }
    
    getY() {
        return this.y;
    }
    
    getName() {
        return this.name;
    }
}
