/**
 * Single-shot naval cannon kits.
 * Tactical interest = lead the foe, juke their ball.
 */

export const WEAPONS = {
    carronade: {
        id: 'carronade',
        label: 'Light Carronade',
        description: 'One slow ball. Lead your mark; dodge theirs.',
        reloadMs: 1600,
        guns: 1,
        spread: 0,
        speed: 155,
        lifetime: 4500,
        color: 0xffcc66,
        radius: 6,
        damage: 1,
        muzzle: 32
    },
    twin_battery: {
        id: 'twin_battery',
        label: 'Heavy Ball',
        description: 'Heavier shot, slightly quicker reload.',
        reloadMs: 1400,
        guns: 1,
        spread: 0,
        speed: 165,
        lifetime: 4500,
        color: 0x88ffcc,
        radius: 6.5,
        damage: 1,
        muzzle: 34
    },
    long_nines: {
        id: 'long_nines',
        label: 'Long Nine',
        description: 'Faster ball, longer reach — still leadable.',
        reloadMs: 1500,
        guns: 1,
        spread: 0,
        speed: 195,
        lifetime: 5000,
        color: 0xaaffff,
        radius: 5.5,
        damage: 1,
        muzzle: 36
    },
    grape_chain: {
        id: 'grape_chain',
        label: 'Chain Shot',
        description: 'Slower ball that drags a hit foe.',
        reloadMs: 1700,
        guns: 1,
        spread: 0,
        speed: 140,
        lifetime: 4200,
        color: 0xffaa66,
        radius: 7,
        damage: 1,
        muzzle: 32,
        seek: false,
        slowOnHit: true
    },
    mortar_deck: {
        id: 'mortar_deck',
        label: 'Mortar Shell',
        description: 'Slow shell with a blast — punish clusters.',
        reloadMs: 2100,
        guns: 1,
        spread: 0,
        speed: 125,
        lifetime: 4800,
        color: 0xff5566,
        radius: 9,
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
    { kind: 'weapon', weaponId: 'twin_battery', toast: 'Station salvage: Heavy Ball mounted!' },
    { kind: 'shields', amount: 30, toast: 'Station salvage: Shield capacitors (+30)' },
    { kind: 'armor', amount: 30, toast: 'Station salvage: Hull plating (+30)' },
    { kind: 'weapon', weaponId: 'long_nines', toast: 'Station salvage: Long Nine fitted!' },
    { kind: 'weapon', weaponId: 'grape_chain', toast: 'Station salvage: Chain shot lockers!' },
    { kind: 'weapon', weaponId: 'mortar_deck', toast: 'Station salvage: Mortar deck online!' },
    { kind: 'shields', amount: 40, toast: 'Station salvage: Military shields (+40)' },
    { kind: 'armor', amount: 40, toast: 'Station salvage: Ablative armor (+40)' }
];
