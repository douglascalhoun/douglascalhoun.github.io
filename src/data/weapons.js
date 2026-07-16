/**
 * Naval cannon kits — side volleys toward the cursor.
 * Aim anywhere except the rear quadrant (clamped to the arc edge).
 */

export const WEAPONS = {
    carronade: {
        id: 'carronade',
        label: 'Light Carronade',
        description: 'Paired balls off the beam.',
        reloadMs: 1600,
        guns: 2,
        spread: 0.12,
        speed: 155,
        lifetime: 4500,
        color: 0xffdd55,
        radius: 6,
        damage: 1,
        muzzle: 28,
        keelSpacing: 11
    },
    twin_battery: {
        id: 'twin_battery',
        label: 'Broadside Four',
        description: 'Four-gun side volley.',
        reloadMs: 1450,
        guns: 4,
        spread: 0.14,
        speed: 160,
        lifetime: 4500,
        color: 0x66ffcc,
        radius: 6,
        damage: 1,
        muzzle: 30,
        keelSpacing: 10
    },
    long_nines: {
        id: 'long_nines',
        label: 'Long Nines',
        description: 'Five fast balls along the rail.',
        reloadMs: 1400,
        guns: 5,
        spread: 0.1,
        speed: 195,
        lifetime: 5000,
        color: 0x88ffff,
        radius: 5.5,
        damage: 1,
        muzzle: 32,
        keelSpacing: 9
    },
    grape_chain: {
        id: 'grape_chain',
        label: 'Grape Broadside',
        description: 'Wide side spray of chain shot.',
        reloadMs: 1650,
        guns: 7,
        spread: 0.2,
        speed: 145,
        lifetime: 4200,
        color: 0xff9944,
        radius: 5.5,
        damage: 1,
        muzzle: 28,
        keelSpacing: 8,
        seek: false,
        slowOnHit: true
    },
    mortar_deck: {
        id: 'mortar_deck',
        label: 'Mortar Broadside',
        description: 'Four blasting shells off the beam.',
        reloadMs: 1950,
        guns: 4,
        spread: 0.16,
        speed: 125,
        lifetime: 4800,
        color: 0xff4466,
        radius: 7,
        damage: 1,
        blast: 90,
        muzzle: 26,
        keelSpacing: 12,
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
    { kind: 'weapon', weaponId: 'twin_battery', toast: 'Station salvage: Broadside Four mounted!' },
    { kind: 'shields', amount: 30, toast: 'Station salvage: Shield capacitors (+30)' },
    { kind: 'armor', amount: 30, toast: 'Station salvage: Hull plating (+30)' },
    { kind: 'weapon', weaponId: 'long_nines', toast: 'Station salvage: Long Nines fitted!' },
    { kind: 'weapon', weaponId: 'grape_chain', toast: 'Station salvage: Grape broadside lockers!' },
    { kind: 'weapon', weaponId: 'mortar_deck', toast: 'Station salvage: Mortar broadside online!' },
    { kind: 'shields', amount: 40, toast: 'Station salvage: Military shields (+40)' },
    { kind: 'armor', amount: 40, toast: 'Station salvage: Ablative armor (+40)' }
];
