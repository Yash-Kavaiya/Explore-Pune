/**
 * Editorial content for the Shaniwar Wada detail page.
 *
 * `FORT_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/shaniwar/fort-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type FortFeature = {
  id:
    | "delhi-darwaza"
    | "ramparts"
    | "hazari-karanje"
    | "palace-plinth"
    | "nagarkhana"
    | "lawns";
  title: string;
  /** Marathi/Persian name of the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const FORT_FEATURES: FortFeature[] = [
  {
    id: "delhi-darwaza",
    title: "The Delhi Darwaza",
    marathi: "दिल्ली दरवाजा · Dillī Darwāzā",
    icon: "castle",
    blurb: "The main gate, deliberately faced north — towards Delhi.",
    detail:
      "The largest of the five gateways, big enough to admit an elephant with its howdah. Its teak doors carry rows of iron spikes set at the height of an elephant's head, the standard answer to a battering charge. That it faces north, towards the Mughal capital, was not an accident of planning — it was the statement.",
  },
  {
    id: "ramparts",
    title: "The ramparts & bastions",
    marathi: "तटबंदी · Tatbandi",
    icon: "mountain-snow",
    blurb: "Nine bastions and a walkable curtain wall enclose the whole complex.",
    detail:
      "The stone shell is the part of Shaniwar Wada that survived. Nine bastions punctuate the curtain wall, and the walkway along the top still gives the best reading of the plan: a fortified rectangle whose inside was never meant to be a fort at all, but a palace.",
  },
  {
    id: "hazari-karanje",
    title: "Hazari Karanje",
    marathi: "हजारी कारंजे · The thousand-jet fountain",
    icon: "droplets",
    blurb: "A lotus-shaped fountain of sixteen petals, built for a child Peshwa.",
    detail:
      "Laid out as a lotus with sixteen petals and fed by some 197 jets, the Hazari Karanje was built for the boy Peshwa Sawai Madhavrao and was one of the most ambitious waterworks of its day in India. The stonework survives; the jets do not, which makes it the most quietly poignant thing in the complex.",
  },
  {
    id: "palace-plinth",
    title: "The palace foundations",
    marathi: "जोते · Jote",
    icon: "landmark",
    blurb: "Stone plinths and column stubs mark rooms that burned in 1828.",
    detail:
      "On 27 February 1828 a fire took hold and burned for seven days. Everything made of wood — and the palace above the plinth was largely teak — was lost. What you walk across today is the outline: floor levels, doorway thresholds and the stumps of columns, laid out like a plan drawing at full size.",
  },
  {
    id: "nagarkhana",
    title: "The Nagarkhana",
    marathi: "नगारखाना · Drum chamber",
    icon: "palette",
    blurb: "The chamber above the gate from which drums announced arrivals.",
    detail:
      "Above the Delhi Darwaza sits the nagarkhana, where drums and shehnai marked the hours and announced who was entering. It is a small room doing a large job: in a court city, sound was how news travelled, and this was the loudspeaker of Peshwa Pune.",
  },
  {
    id: "lawns",
    title: "The lawns & the light show",
    marathi: "बाग · Bāg",
    icon: "trees",
    blurb: "Open ground inside the walls, and the evening sound-and-light show.",
    detail:
      "Most of the interior is now lawn, which is why the complex reads as bigger than it is. After sunset the ramparts become the screen for a sound-and-light show that narrates the Peshwa century — including the 1773 murder of the young Narayanrao, the source of the fort's persistent ghost story.",
  },
];

export const FORT_STATS: { label: string; value: string; note: string }[] = [
  { label: "Built", value: "1730–32", note: "Begun by Peshwa Baji Rao I" },
  { label: "Seat of power", value: "Till 1818", note: "Capital of the Maratha Peshwas" },
  { label: "The fire", value: "1828", note: "Burned seven days; only stone survived" },
  { label: "Gateways", value: "5 · 9 bastions", note: "Delhi Darwaza is the largest" },
];

export const FORT_STORY: { heading: string; body: string }[] = [
  {
    heading: "A palace that had to look like a fort",
    body: "Baji Rao I laid the foundation of Shaniwar Wada in 1730 and the complex was occupied from 1732. It was built as a residence, not a citadel — but the residence of the Peshwas, who by then ran the Maratha empire from Pune. So it was given a fort's shell: a curtain wall, nine bastions, five gates, and a north gateway of a size no one could mistake for domestic architecture.",
  },
  {
    heading: "Seven days of fire",
    body: "The palace inside the walls was largely teak — halls, galleries, screens, staircases, all of it timber and all of it flammable. In February 1828 a fire broke out and burned for a week. Nothing wooden survived. What remains is the stone: the gates, the bastions, the plinths and the fountain base. Shaniwar Wada is now a ground plan you can walk through rather than a building you can enter.",
  },
  {
    heading: "The story people come for",
    body: "In 1773 the teenaged Peshwa Narayanrao was killed inside these walls in a palace conspiracy; the cry attributed to him — 'Kākā, malā vāchvā', uncle, save me — has attached itself to the site ever since, and to the ghost story told about it. Treat it as folklore rather than fact, but it is why the evening show draws the crowd it does.",
  },
];

export const FORT_ETIQUETTE: string[] = [
  "The complex is open ground with little shade — carry water and avoid mid-afternoon in summer.",
  "The plinths and fountain base are protected monument fabric; walk the marked routes, don't climb.",
  "Show timings and languages change with the season — confirm at the ticket counter on the day.",
  "It is an ASI-protected monument; drones and tripods need prior permission.",
];

export const FORT_FAQS: { q: string; a: string }[] = [
  {
    q: "Is there anything left inside Shaniwar Wada?",
    a: "Not in the sense of rooms you can enter. The 1828 fire destroyed the wooden palace, so what survives is the fortification — gates, bastions, ramparts — plus the stone plinths of the palace and the base of the Hazari Karanje fountain. Come for the scale and the story, not for interiors.",
  },
  {
    q: "Is the sound-and-light show worth staying for?",
    a: "If you are already in the old city in the late afternoon, yes — the floodlit ramparts are the best version of the place. Shows usually run in the evening in Marathi and then English, but the schedule shifts, so check at the counter.",
  },
  {
    q: "How much time does it need?",
    a: "An hour is enough to walk the ramparts, the Delhi Darwaza and the plinths at a comfortable pace. Two if you stay for the show.",
  },
  {
    q: "Is Shaniwar Wada really haunted?",
    a: "It is one of Pune's best-known ghost stories, tied to the 1773 killing of Narayanrao. The murder is historical; the haunting is folklore. It has no bearing on visiting — the complex closes well before the stories are supposed to start.",
  },
  {
    q: "What else can I combine it with?",
    a: "Lal Mahal and the Dagdusheth Halwai Ganapati temple are both a short walk away, and the Raja Dinkar Kelkar Museum is a few minutes by auto — enough for a full old-city half day.",
  },
];
