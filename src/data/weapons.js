/**
 * Naval cannon kits — upgrades mean more balls in a forward spread volley.
 * Fire always along the bow (Escape Velocity / Asteroids helm).
 */

export const WEAPONS = {
    carronade: {
        id: 'carronade',
        label: 'Light Carronade',
        description: 'One slow ball straight off the bow.',
        reloadMs: 1600,
        guns: 1,
        spread: 0,
        speed: 155,
        lifetime: 4500,
        color: 0xffdd55,
        radius: 6,
        damage: 1,
        muzzle: 32
    },
    twin_battery: {
        id: 'twin_battery',
        label: 'Triple Shot',
        description: 'Three balls in a tight fan.',
        reloadMs: 1500,
        guns: 3,
        spread: 0.11,
        speed: 160,
        lifetime: 4500,
        color: 0x66ffcc,
        radius: 6,
        damage: 1,
        muzzle: 34
    },
    long_nines: {
        id: 'long_nines',
        label: 'Long Nines',
        description: 'Four fast balls, narrow cone.',
        reloadMs: 1450,
        guns: 4,
        spread: 0.07,
        speed: 195,
        lifetime: 5000,
        color: 0x88ffff,
        radius: 5.5,
        damage: 1,
        muzzle: 36
    },
    grape_chain: {
        id: 'grape_chain',
        label: 'Grape Volley',
        description: 'Wide spray of chain shot.',
        reloadMs: 1700,
        guns: 6,
        spread: 0.16,
        speed: 145,
        lifetime: 4200,
        color: 0xff9944,
        radius: 5.5,
        damage: 1,
        muzzle: 32,
        seek: false,
        slowOnHit: true
    },
    mortar_deck: {
        id: 'mortar_deck',
        label: 'Mortar Broadside',
        description: 'Three blasting shells off the bow.',
        reloadMs: 2000,
        guns: 3,
        spread: 0.14,
        speed: 125,
        lifetime: 4800,
        color: 0xff4466,
        radius: 7,
        damage: 1,
        blast: 90,
        muzzle: 28,
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
    { kind: 'weapon', weaponId: 'twin_battery', toast: 'Station salvage: Triple Shot mounted!' },
    { kind: 'shields', amount: 30, toast: 'Station salvage: Shield capacitors (+30)' },
    { kind: 'armor', amount: 30, toast: 'Station salvage: Hull plating (+30)' },
    { kind: 'weapon', weaponId: 'long_nines', toast: 'Station salvage: Long Nines fitted!' },
    { kind: 'weapon', weaponId: 'grape_chain', toast: 'Station salvage: Grape volley lockers!' },
    { kind: 'weapon', weaponId: 'mortar_deck', toast: 'Station salvage: Mortar broadside online!' },
    { kind: 'shields', amount: 40, toast: 'Station salvage: Military shields (+40)' },
    { kind: 'armor', amount: 40, toast: 'Station salvage: Ablative armor (+40)' }
];
