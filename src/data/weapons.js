/**
 * Lean naval kits — fewer, smaller balls. Upgrades add modest spread, not a wall of shot.
 */

export const WEAPONS = {
    carronade: {
        id: 'carronade',
        label: 'Light Carronade',
        description: 'One slow ball. Lead your mark.',
        reloadMs: 1700,
        guns: 1,
        spread: 0,
        speed: 155,
        lifetime: 4500,
        color: 0xffdd55,
        radius: 4.5,
        damage: 1,
        muzzle: 28,
        keelSpacing: 10
    },
    twin_battery: {
        id: 'twin_battery',
        label: 'Twin Shot',
        description: 'Two balls off the beam.',
        reloadMs: 1550,
        guns: 2,
        spread: 0.1,
        speed: 160,
        lifetime: 4500,
        color: 0x66ffcc,
        radius: 4.5,
        damage: 1,
        muzzle: 28,
        keelSpacing: 12
    },
    long_nines: {
        id: 'long_nines',
        label: 'Long Nines',
        description: 'Two fast balls, tight cone.',
        reloadMs: 1500,
        guns: 2,
        spread: 0.07,
        speed: 195,
        lifetime: 5000,
        color: 0x88ffff,
        radius: 4,
        damage: 1,
        muzzle: 30,
        keelSpacing: 11
    },
    grape_chain: {
        id: 'grape_chain',
        label: 'Grape Shot',
        description: 'Three-ball chain spray.',
        reloadMs: 1750,
        guns: 3,
        spread: 0.14,
        speed: 145,
        lifetime: 4200,
        color: 0xff9944,
        radius: 4,
        damage: 1,
        muzzle: 28,
        keelSpacing: 9,
        seek: false,
        slowOnHit: true
    },
    mortar_deck: {
        id: 'mortar_deck',
        label: 'Mortar Pair',
        description: 'Two blasting shells.',
        reloadMs: 2100,
        guns: 2,
        spread: 0.12,
        speed: 125,
        lifetime: 4800,
        color: 0xff4466,
        radius: 5.5,
        damage: 1,
        blast: 70,
        muzzle: 26,
        keelSpacing: 14,
        kind: 'bomb'
    }
};

export const WEAPON_ALIASES = {
    cannon: 'carronade',
    double_laser: 'twin_battery',
    super_laser: 'long_nines',
    missile_laser: 'grape_chain',
    big_bomb: 'mortar_deck'
};

export const HARVEST_REWARDS = [
    { kind: 'weapon', weaponId: 'twin_battery', toast: 'Station salvage: Twin Shot mounted!' },
    { kind: 'shields', amount: 30, toast: 'Station salvage: Shield capacitors (+30)' },
    { kind: 'armor', amount: 30, toast: 'Station salvage: Hull plating (+30)' },
    { kind: 'weapon', weaponId: 'long_nines', toast: 'Station salvage: Long Nines fitted!' },
    { kind: 'weapon', weaponId: 'grape_chain', toast: 'Station salvage: Grape shot lockers!' },
    { kind: 'weapon', weaponId: 'mortar_deck', toast: 'Station salvage: Mortar pair online!' },
    { kind: 'shields', amount: 40, toast: 'Station salvage: Military shields (+40)' },
    { kind: 'armor', amount: 40, toast: 'Station salvage: Ablative armor (+40)' }
];
