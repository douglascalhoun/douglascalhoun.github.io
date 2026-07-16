/**
 * Naval battery kits — Age-of-Sail space combat.
 * Free-aim volleys with ripple fire; skill = lead, inertia, and the pass.
 */

export const WEAPONS = {
    carronade: {
        id: 'carronade',
        label: 'Light Carronades',
        description: 'Slow starter broadsides. Learn the pass.',
        reloadMs: 2400,
        guns: 3,
        spread: 0.28,
        speed: 145,
        lifetime: 3400,
        color: 0xffcc66,
        radius: 5,
        damage: 1,
        muzzle: 28
    },
    twin_battery: {
        id: 'twin_battery',
        label: 'Twin Batteries',
        description: 'More guns per volley, still deliberate.',
        reloadMs: 2100,
        guns: 5,
        spread: 0.34,
        speed: 155,
        lifetime: 3400,
        color: 0x88ffcc,
        radius: 4.5,
        damage: 1,
        muzzle: 30
    },
    long_nines: {
        id: 'long_nines',
        label: 'Long Nines',
        description: 'Faster shot, tighter cone — rake from farther out.',
        reloadMs: 2000,
        guns: 4,
        spread: 0.16,
        speed: 210,
        lifetime: 3800,
        color: 0xaaffff,
        radius: 4,
        damage: 1,
        muzzle: 32
    },
    grape_chain: {
        id: 'grape_chain',
        label: 'Grape + Chain',
        description: 'Wide grape volley plus a slow chain shot that drags foes.',
        reloadMs: 2300,
        guns: 6,
        spread: 0.48,
        speed: 140,
        lifetime: 3000,
        color: 0xffaa66,
        radius: 3.5,
        damage: 1,
        muzzle: 30,
        chain: { speed: 110, lifetime: 4200, seek: true, color: 0xff6644, radius: 6 }
    },
    mortar_deck: {
        id: 'mortar_deck',
        label: 'Mortar Deck',
        description: 'Arcing nova shells with blast — punish clustered foes.',
        reloadMs: 2800,
        guns: 2,
        spread: 0.2,
        speed: 120,
        lifetime: 3600,
        color: 0xff5566,
        radius: 8,
        damage: 1,
        blast: 100,
        muzzle: 26,
        kind: 'bomb'
    }
};

// Map old salvage ids → naval kits so existing saves don't break
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
