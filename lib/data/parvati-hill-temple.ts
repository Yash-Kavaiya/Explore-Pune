/**
 * Editorial content for the Parvati Hill Temple detail page.
 *
 * `PARVATI_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/parvati/parvati-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type ParvatiFeature = {
  id:
    | "steps"
    | "gateway"
    | "devdeveshwar"
    | "shrine-cluster"
    | "peshwa-museum"
    | "panorama";
  title: string;
  /** Marathi term for the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const PARVATI_FEATURES: ParvatiFeature[] = [
  {
    id: "steps",
    title: "The 103 Steps",
    marathi: "पायऱ्या · Pāyaṛyā",
    icon: "route",
    blurb: "The stone stairway from Parvati Paytha that every Punekar has climbed at least once.",
    detail:
      "The climb begins at Parvati Paytha — literally 'the foot of Parvati' — where a broad flight of dressed stone steps rises straight up the southern face of the hill. There are 103 of them, worn smooth and slightly cupped in the middle by three centuries of feet: dawn walkers, dabbas of offerings, wedding parties, and school children counting aloud. Rest landings break the climb, and on Mahashivratri the whole stairway is strung with lights until it looks like a rivulet of fire running up the hill.",
  },
  {
    id: "gateway",
    title: "The Hill Gateway",
    marathi: "प्रवेशद्वार · Pravēśadvār",
    icon: "door-open",
    blurb: "The old stone arch partway up, where the climb becomes a pilgrimage.",
    detail:
      "Roughly halfway up the steps stands a weathered stone gateway, its lintel blackened by decades of lamp soot and monsoon moss. Passing under it was once the formal threshold of the temple lands; today it is where climbers pause, catch their breath, and get the first framed glimpse of the shikhara above. Look for the carved niches in its piers — they once held oil lamps that were lit every evening.",
  },
  {
    id: "devdeveshwar",
    title: "Devdeveshwar Temple",
    marathi: "देवदेवेश्वर · Devdēvēśvar",
    icon: "landmark",
    blurb: "The main Shiva shrine of the Peshwas, crowned with a black-stone shikhara.",
    detail:
      "Built in 1749 under Peshwa Balaji Baji Rao (Nanasaheb), the Devdeveshwar temple is the spiritual centre of the hill. The dark basalt sanctum houses the Shiva pindi, and above it rises a curvilinear shikhara whose silhouette is visible from across the old city. A brass-plated Nandi faces the linga from the open mandap, and the temple still follows the Peshwa-era rhythm of abhishek at dawn and aarti at dusk.",
  },
  {
    id: "shrine-cluster",
    title: "The Shrine Cluster",
    marathi: "देवालये · Dēvālayē",
    icon: "house",
    blurb: "Vishnu, Ganesha and Kartikeya — the family of shrines around the main temple.",
    detail:
      "Parvati is not one temple but a court of them. Around the Devdeveshwar shrine stand smaller temples to Vishnu, Ganesha and Kartikeya, each with its own plinth, mandap and miniature shikhara, all in the same warm black stone. The cluster turns the summit into a slow clockwise walk — devout visitors do a pradakshina of the whole group, and each shrine has its own priest, its own lamp, and its own regulars.",
  },
  {
    id: "peshwa-museum",
    title: "The Peshwa Museum",
    marathi: "पेशवे संग्रहालय · Pēśvē Saṅgrahālay",
    icon: "palette",
    blurb: "Peshwa-era weapons, coins and manuscripts inside the old hilltop residence.",
    detail:
      "The summit also holds a small museum housed in a Peshwa-period building with a sloping tiled roof and a columned veranda. Inside are swords and daggers from the Peshwa armoury, coins and seals, farmans and letters in Modi script, portraits of the Peshwa court, and a famous set of old maps of Pune. It is a quiet, one-room-deep kind of museum — allow twenty minutes, and ask the caretaker about the silver paan box.",
  },
  {
    id: "panorama",
    title: "The City Panorama",
    marathi: "नगरदर्शन · Nagardarśan",
    icon: "mountain",
    blurb: "The south parapet — one of the finest 180° views over Pune, river to ridge.",
    detail:
      "From the stone parapet on the southern rim, all of Pune is laid out like a relief map: the old-city peths and temple spires directly below, the Mutha river catching the light to the west, Saras Baug's trees, and on a clear day the blue wall of the Sahyadris behind Sinhagad. Sunrise sets the city gold; on winter evenings the lights come on in waves. This is the view the Peshwas rode up to see — and the reason the climb is worth it.",
  },
];

export const PARVATI_STATS: { label: string; value: string; note: string }[] = [
  { label: "Elevation", value: "≈ 640 m", note: "About 2,100 ft — among Pune's highest points" },
  { label: "Steps", value: "103", note: "Stone steps from Parvati Paytha" },
  { label: "Main temple built", value: "1749", note: "Under Peshwa Balaji Baji Rao (Nanasaheb)" },
  { label: "Shrines at summit", value: "5", note: "Shiva, Vishnu, Ganesha, Kartikeya & Parvati" },
];

export const PARVATI_STORY: { heading: string; body: string }[] = [
  {
    heading: "The Peshwas' hill",
    body:
      "Parvati Hill was sacred ground long before it was political. When the Peshwas rose to power in the 18th century, Balaji Baji Rao — Nanasaheb — chose this summit, the highest point near the city, for a temple to Shiva as Devdeveshwar, 'lord of lords'. In 1749 the main shrine was completed, and the hill became the Peshwa family's private acropolis: a place for vows before campaigns and thanksgiving after them. The cluster grew over the decades — Vishnu, Ganesha, Kartikeya — until the summit held a whole court of shrines looking down on the city the Peshwas ruled.",
  },
  {
    heading: "A staircase the city grew around",
    body:
      "The 103 steps from Parvati Paytha were the ceremonial approach, wide enough for palanquins and state processions. Pune grew up around their feet: the peths spread north, Saras Baug's lake was drained and gardened, and the hill changed from a fortress-quiet height to the city's morning walk. Today the same steps carry a different procession — fitness walkers before sunrise, students, grandmothers with oil lamps, photographers chasing the golden hour. Ask anyone counting steps aloud: the answer is still 103.",
  },
  {
    heading: "Pune's natural balcony",
    body:
      "Every Punekar has a Parvati view story: the first monsoon cloud rolling over the city, the Ganeshotsav night when the whole basin glittered, the winter morning the fog filled the river course like milk. The summit parapet offers a 180-degree sweep from the old city's spires to the Sahyadri ridge, and at dusk the city lights come on in waves below. The museum beside the temples holds the Peshwa era in objects — swords, coins, letters — but the real exhibit is outside, and it changes every hour of the day.",
  },
];

export const PARVATI_ETIQUETTE: string[] = [
  "The steps are the only way up — wear shoes with grip; they can be slick after rain.",
  "Footwear comes off before entering any of the shrine mandaps; there are racks near the summit.",
  "Dress modestly inside the temples; shoulders and knees covered.",
  "Photography is welcome on the hill and parapet, but not of the sanctum idols.",
  "Carry water in summer; there are small stalls at the paytha, none at the top.",
  "Give way to devotees climbing with offerings, and keep the summit quiet during aarti.",
];

export const PARVATI_FAQS: { q: string; a: string }[] = [
  {
    q: "How hard is the climb?",
    a:
      "It is 103 broad stone steps — most people take 10–15 minutes at an easy pace, with flat landings to rest. It is not wheelchair accessible, and there is no road to the summit. Go before 8 AM or after 5 PM in summer to avoid the heat on the exposed stone.",
  },
  {
    q: "What is the best time of day to visit?",
    a:
      "Sunrise is the classic: cool air, the city turning gold below, and the morning abhishek at the Devdeveshwar temple. Sunset is the other favourite, when the city lights come on. Mahashivratri is the biggest festival, with the stairway lit end to end — spectacular but very crowded.",
  },
  {
    q: "Is there an entry fee?",
    a:
      "No — the hill, the steps and the temples are free. The small Peshwa museum at the summit may charge a nominal fee; carry small change.",
  },
  {
    q: "Which temples are at the top?",
    a:
      "Five main shrines: Devdeveshwar (Shiva) is the principal temple, with Vishnu, Ganesha, Kartikeya and Parvati shrines around it, plus the small Peshwa-era museum. The whole summit can be done as one slow clockwise loop.",
  },
  {
    q: "Can I combine Parvati Hill with other sights?",
    a:
      "Yes — Saras Baug is at the foot of the hill and makes a natural pairing (garden first, steps after). Pataleshwar Cave Temple and Shaniwar Wada are short drives away, so the hill fits easily into an old-city day.",
  },
];
