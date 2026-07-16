/**
 * Naval battery kits — slow, spreading volleys toward the reticle.
 */

export const WEAPONS = {
    carronade: {
        id: 'carronade',
        label: 'Light Carronades',
        description: 'Slow spreading iron. Point the reticle and speak.',
        reloadMs: 2200,
        guns: 4,
        spread: 0.42,
        speed: 105,
        lifetime: 4200,
        color: 0xffcc66,
        radius: 5,
        damage: 1,
        muzzle: 30
    },
    twin_battery: {
        id: 'twin_battery',
        label: 'Twin Batteries',
        description: 'More guns, still deliberate.',
        reloadMs: 2000,
        guns: 6,
        spread: 0.5,
        speed: 110,
        lifetime: 4200,
        color: 0x88ffcc,
        radius: 4.5,
        damage: 1,
        muzzle: 32
    },
    long_nines: {
        id: 'long_nines',
        label: 'Long Nines',
        description: 'Tighter cone, a bit more reach.',
        reloadMs: 1900,
        guns: 4,
        spread: 0.22,
        speed: 145,
        lifetime: 4500,
        color: 0xaaffff,
        radius: 4,
        damage: 1,
        muzzle: 34
    },
    grape_chain: {
        id: 'grape_chain',
        label: 'Grape + Chain',
        description: 'Wide grape cloud plus a dragging chain shot.',
        reloadMs: 2300,
        guns: 7,
        spread: 0.62,
        speed: 95,
        lifetime: 3800,
        color: 0xffaa66,
        radius: 3.5,
        damage: 1,
        muzzle: 30,
        chain: { speed: 85, lifetime: 4800, seek: true, color: 0xff6644, radius: 6 }
    },
    mortar_deck: {
        id: 'mortar_deck',
        label: 'Mortar Deck',
        description: 'Slow nova shells with blast.',
        reloadMs: 2800,
        guns: 2,
        spread: 0.28,
        speed: 90,
        lifetime: 4200,
        color: 0xff5566,
        radius: 8,
        damage: 1,
        blast: 100,
        muzzle: 26,
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
    { kind: 'weapon', weaponId: 'twin_battery', toast: 'Station salvage: Twin Batteries mounted!' },
    { kind: 'shields', amount: 30, toast: 'Station salvage: Shield capacitors (+30)' },
    { kind: 'armor', amount: 30, toast: 'Station salvage: Hull plating (+30)' },
    { kind: 'weapon', weaponId: 'long_nines', toast: 'Station salvage: Long Nines fitted!' },
    { kind: 'weapon', weaponId: 'grape_chain', toast: 'Station salvage: Grape + Chain lockers!' },
    { kind: 'weapon', weaponId: 'mortar_deck', toast: 'Station salvage: Mortar deck online!' },
    { kind: 'shields', amount: 40, toast: 'Station salvage: Military shields (+40)' },
    { kind: 'armor', amount: 40, toast: 'Station salvage: Ablative armor (+40)' }
];
