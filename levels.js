export const LEVELS = [
  { id: 1, title: "Will love last forever?" },
  { id: 2, title: "Can two people really stay the same?" },
  { id: 3, title: "Is love stronger than time?" },
  { id: 4, title: "Can love heal every wound?" },
  { id: 5, title: "Is heartbreak necessary for love?" },
  { id: 6, title: "Does true love hurt?" },
  { id: 7, title: "Can love exist without possession?" },
  { id: 8, title: "Is jealousy proof of love?" },
  { id: 9, title: "Can love set us free?" },
  { id: 10, title: "Is love just a chemical reaction?" },
  { id: 11, title: "Is love an illusion?" },
  { id: 12, title: "Is love a choice?" },
  { id: 13, title: "Does everyone only have one true love?" },
  { id: 14, title: "Is love a matter of fate?" },
  { id: 15, title: "Is love always worth it?" },
  { id: 16, title: "Do I love myself enough to love you?" },
  { id: 17, title: "Am I ready to let go?" },
  { id: 18, title: "Will I regret this choice?" },
  { id: 19, title: "Is this the life I imagined?" },
  { id: 20, title: "Will I still love you tomorrow?" }
];

// Utility to pick a random one
export function pickRandomLevel() {
  return LEVELS[Math.floor(Math.random() * LEVELS.length)];
}
