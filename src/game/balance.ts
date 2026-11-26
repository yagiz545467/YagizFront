export const B = {
  players: { min: 2, max: 8 }, citiesPerPlayer: 4, actions: 3,
  initialGold: 500, initialTroops: 80, neutralTroops: 24,
  income: 35, production: 12, tradeIncome: 45, researchPerLab: 18,
  costs: { city: 160, upgrade: 120, port: 140, lab: 200, ship: 100, recruit: 80, marry: 80, child: 100, spy: 100, security: 90, nuke: 1600 },
  recruit: 35, shipCapacity: 160, maxShips: 8, maxLevel: 5, maxChildren: 4,
  spyDelay: 2, spyChance: .64, assassinationChance: .35, sabotageDamage: .4,
  eventChance: .4, visitorRisk: .15, childChance: .8, revoltChance: .3,
  atomicChance: .01, researchThresholds: [80, 140, 220, 320, 450, 600],
  tactical: { attack: 1.1, defend: 1.0, siege: 1.15, crescent: 1, feint: .85 },
  counterBonus: 1.35, defenseBonus: 1.08, mountainBonus: 1.2, forestBonus: 1.1,
  fatiguePenalty: .006, battleFatigue: 25, recovery: 15, minFatigueMultiplier: .4,
  casualtyWin: .2, casualtyLose: .7, pursuitTrap: .6, retreatLoss: .12,
  navalPenalty: .85, attackTroopMin: 5, rulerCaptureRisk: .45,
} as const;
export const TACTICS = { attack: 'Taarruz', defend: 'Savunma', siege: 'Kuşatma', crescent: 'Hilal', feint: 'Sahte geri çekilme' } as const;
export const TECHS = ['Tarım ve pazarlar', 'Açık deniz rotaları', 'Çelik ve disiplin', 'Top dökümü', 'Tüfekçilik', 'İleri fizik'] as const;
