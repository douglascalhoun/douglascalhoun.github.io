/** Player weapon kits — distinct verbs, not just bigger numbers */

export const WEAPONS = {
    cannon: {
        id: 'cannon',
        label: 'Pea Cannon',
        description: 'Slow single shot. Clunky starter.',
        fireRate: 480,
        shots: [{ angleOffset: 0, speed: 420, color: 0x88ffaa, radius: 3, lifetime: 1400 }]
    },
    double_laser: {
        id: 'double_laser',
        label: 'Twin Laser',
        description: 'Two parallel beams.',
        fireRate: 320,
        shots: [
            { angleOffset: -0.12, speed: 560, color: 0x66ffcc, radius: 2.5, lifetime: 1300, lateral: -8 },
            { angleOffset: 0.12, speed: 560, color: 0x66ffcc, radius: 2.5, lifetime: 1300, lateral: 8 }
        ]
    },
    super_laser: {
        id: 'super_laser',
        label: 'Super Laser',
        description: 'Fast, long-range needle.',
        fireRate: 220,
        shots: [{ angleOffset: 0, speed: 780, color: 0xaaffff, radius: 2, lifetime: 1600, stretch: true }]
    },
    missile_laser: {
        id: 'missile_laser',
        label: 'Laser + Missile',
        description: 'Beam plus a slow seeking missile.',
        fireRate: 380,
        shots: [
            { angleOffset: 0, speed: 620, color: 0x88ffcc, radius: 2.5, lifetime: 1200 },
            { angleOffset: 0, speed: 280, color: 0xff8844, radius: 5, lifetime: 2200, seek: true }
        ]
    },
    big_bomb: {
        id: 'big_bomb',
        label: 'Nova Bomb',
        description: 'Slow ordnance with blast radius on impact.',
        fireRate: 700,
        shots: [{ angleOffset: 0, speed: 220, color: 0xff5566, radius: 8, lifetime: 2500, blast: 90 }]
    }
};

export const HARVEST_REWARDS = [
    { kind: 'weapon', weaponId: 'double_laser', toast: 'Station salvage: Twin Laser online!' },
    { kind: 'shields', amount: 30, toast: 'Station salvage: Shield capacitors installed (+30)' },
    { kind: 'armor', amount: 30, toast: 'Station salvage: Hull plating reinforced (+30)' },
    { kind: 'weapon', weaponId: 'super_laser', toast: 'Station salvage: Super Laser online!' },
    { kind: 'weapon', weaponId: 'missile_laser', toast: 'Station salvage: Laser + Missile rack!' },
    { kind: 'weapon', weaponId: 'big_bomb', toast: 'Station salvage: Nova Bomb launcher!' },
    { kind: 'shields', amount: 40, toast: 'Station salvage: Military shields (+40)' },
    { kind: 'armor', amount: 40, toast: 'Station salvage: Ablative armor (+40)' }
];
