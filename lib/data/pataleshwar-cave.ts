/**
 * Editorial content for the Pataleshwar Cave Temple detail page.
 *
 * `CAVE_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/pataleshwar/cave-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type CaveFeature = {
  id:
    | "sunken-court"
    | "nandi-mandapa"
    | "cave-mouth"
    | "pillared-hall"
    | "linga-sanctum"
    | "unfinished-work";
  title: string;
  /** Marathi term for the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const CAVE_FEATURES: CaveFeature[] = [
  {
    id: "sunken-court",
    title: "The Sunken Court",
    marathi: "आंगण · Āṅgaṇa",
    icon: "mountain",
    blurb: "A monolithic basalt courtyard cut below Jangli Maharaj Road — the first sign you have left the street.",
    detail:
      "Pataleshwar is not a temple you walk up to. You walk down. The court is a rectangular excavation in a single sheet of Deccan trap, its floor several metres below the pavement of JM Road. Traffic and plane trees sit on the rim; cool shade and dressed-stone steps sit in the hole. That drop is the whole idea of the place — a Rashtrakuta shrine that begins only after the city has been left overhead.",
  },
  {
    id: "nandi-mandapa",
    title: "The Nandi Mandapa",
    marathi: "नंदी मंडप · Nandī Maṇḍap",
    icon: "landmark",
    blurb: "A circular ring of squat pillars around Nandi, open to the sky, facing the cave mouth.",
    detail:
      "In the middle of the court stands the temple's signature: a round Nandi pavilion. A ring of heavy basalt pillars once carried a circular roof; the roof is gone, so the bull sits in open air, always facing the cave. The plan is unusual for a rock-cut shrine — a free-standing circle in an excavated yard, not a built-up mandapa on a jagati — and it is the first thing every visitor photographs.",
  },
  {
    id: "cave-mouth",
    title: "The Cave Mouth",
    marathi: "गुहामुख · Guhāmukh",
    icon: "door-open",
    blurb: "A dark rectangular opening cut into the living rock, the threshold between court and hall.",
    detail:
      "The south face of the excavation is not a built wall. It is the original basalt, dressed back until a rectangular mouth opens into the hill. Step across the threshold and the temperature drops; street noise falls away. The mouth is the hinge of the whole layout — Nandi in the light, the pillared hall in the dark, the linga still further in.",
  },
  {
    id: "pillared-hall",
    title: "The Pillared Hall",
    marathi: "स्तंभ मंडप · Stambha Maṇḍap",
    icon: "house",
    blurb: "A large rock-cut sabha mandap whose massive pillars were never quite finished.",
    detail:
      "Behind the mouth the rock opens into a broad, low hall. The pillars are thick, squat and still showing the mason's blocks — some shafts are only roughed out, others carry the beginning of a capital. This is a sabha mandap in the Deccan cave tradition, closer to Ellora than to any Peshwa temple: no teak, no marble, no shikhara, just a room subtracted from the hill so a congregation could stand in front of Shiva.",
  },
  {
    id: "linga-sanctum",
    title: "The Linga Sanctum",
    marathi: "गर्भगृह · Garbhagṛha",
    icon: "gem",
    blurb: "A still-lower cella at the back of the hall, holding the Shivalinga that gives the cave its name.",
    detail:
      "The garbhagriha is a small chamber cut one step deeper and lower than the hall, so the linga sits in the true 'below' of Pataleshwar — Patala, the underworld. A dark stone pindi on its yoni-peetha is still worshipped; oil lamps stain the ceiling. You do not look up at a tower here. You look down and in, which is why the Rashtrakutas named the deity the Lord of the Netherworld.",
  },
  {
    id: "unfinished-work",
    title: "The Unfinished Rock",
    marathi: "अपूर्ण शिल्प · Apūrṇa Śilpa",
    icon: "palette",
    blurb: "Stub pillars and raw rock faces where the 8th-century masons simply stopped.",
    detail:
      "Pataleshwar was never completed. Along one side of the hall the pillars stop at different heights; relief panels were blocked out and abandoned; a mass of living rock still waits for a chisel that never came back. Scholars argue over why — a shift of patronage, a military campaign, a flaw in the stone. The pause is part of the visit: you are looking at an 8th-century construction site that became a living temple anyway.",
  },
];

export const CAVE_STATS: { label: string; value: string; note: string }[] = [
  { label: "Carved", value: "8th century", note: "Rashtrakuta period, not a built-up temple" },
  { label: "Deity", value: "Pataleshwar", note: "Shiva as Lord of the Underworld" },
  { label: "Material", value: "One basalt", note: "Monolithic Deccan trap, excavated in situ" },
  { label: "Plan", value: "Cave + court", note: "Sunken yard, circular Nandi, rock-cut hall" },
];

export const CAVE_STORY: { heading: string; body: string }[] = [
  {
    heading: "Carved, not built",
    body:
      "In the eighth century the Rashtrakutas cut a Shiva shrine out of a single sheet of Deccan basalt on the ground that is now Shivajinagar. They did not raise a shikhara or assemble a mandapa from dressed blocks. They subtracted. The court was sunk, the circular Nandi pavilion was left standing in the hole, and a hall was tunnelled into the remaining rock. The method is the same family as Ellora and Elephanta — a Deccan cave temple — only here it sits, improbably, a few steps off a modern arterial road.",
  },
  {
    heading: "Lord of the Underworld",
    body:
      "Pataleshwar means the lord of Patala, the netherworld. The name is not a flourish. The shrine is literally below the street: the Nandi waits in a sunken court, the sabha mandap is a room inside the rock, and the linga sits one level lower still. Devotees have kept the pindi in worship for centuries, so the cave is both an ASI-protected monument and a working temple. That double life is why the lamps are still lit and why you take your shoes off before you go in.",
  },
  {
    heading: "An unfinished prayer in the middle of the city",
    body:
      "The masons stopped. Stub pillars, blocked-out reliefs and a raw rock face remain where a finished hall would have been. Around the rim, Jangli Maharaj Road and the city's plane trees carry on as if the eighth century were not sitting in a hole beside them. Visit in the morning, when the court is quiet and the pillars photograph cleanly, and the contrast is the point: a Rashtrakuta cave, incomplete and still alive, holding a pocket of cool dark under Pune's traffic.",
  },
];

export const CAVE_ETIQUETTE: string[] = [
  "The court is several steps below the street — watch your footing, especially after rain.",
  "Footwear comes off before you enter the cave hall; there are racks near the mouth.",
  "Dress modestly inside the shrine; shoulders and knees covered.",
  "This is a living temple as well as a monument — keep voices low around the linga.",
  "Photography of the court, Nandi and pillars is welcome; do not use flash in the sanctum.",
  "Do not climb the Nandi, the circular pillars, or the unfinished rock faces.",
];

export const CAVE_FAQS: { q: string; a: string }[] = [
  {
    q: "Why is it called Pataleshwar?",
    a: "Pataleshwar means 'Lord of the Underworld' — Shiva as the deity of Patala. The name fits the architecture: the shrine is excavated below street level, and the linga sits in a sanctum that is deeper and lower than the Nandi court.",
  },
  {
    q: "Is there an entry fee?",
    a: "No. The cave is free to enter. It is an ASI-protected monument and a living temple; donations at the shrine are voluntary.",
  },
  {
    q: "How old is the cave?",
    a: "It was rock-cut in the 8th century during the Rashtrakuta period. It is one of Pune's oldest surviving shrines, older than the Peshwa city that later grew around it.",
  },
  {
    q: "Can I take photographs?",
    a: "Yes, in the sunken court and of the Nandi mandapa and pillars. Avoid flash inside the sanctum, and do not block devotees who have come for darshan.",
  },
  {
    q: "How long should I spend here?",
    a: "Thirty to forty-five minutes is enough for the court, the circular Nandi, the hall and the linga. Mornings are quietest. Pair it with Shaniwar Wada or a café walk along JM Road.",
  },
];
