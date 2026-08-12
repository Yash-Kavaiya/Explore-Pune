/**
 * Editorial content for the Pune-Okayama Friendship Garden detail page.
 *
 * `GARDEN_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/okayama/garden-scene.tsx) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type GardenFeature = {
  id: "waterfall" | "taiko-bridge" | "lantern-walk" | "tea-pavilion" | "koi-pond" | "bamboo-grove";
  title: string;
  /** Japanese term for the element, with romaji. */
  japanese: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const GARDEN_FEATURES: GardenFeature[] = [
  {
    id: "waterfall",
    title: "The cascade & rockery",
    japanese: "滝 · taki",
    icon: "droplets",
    blurb: "Water enters the garden from a boulder-stacked fall at the high, north end.",
    detail:
      "A Japanese stroll garden is read like a scroll, and it opens at the water source. Boulders are set so the sheet of water breaks three or four times on its way down — the sound arrives before the view does. It is loudest right after the monsoon, when the channels above it are full.",
  },
  {
    id: "taiko-bridge",
    title: "The arched bridge",
    japanese: "太鼓橋 · taiko-bashi",
    icon: "route",
    blurb: "A steep 'drum bridge' whose reflection closes into a circle on still water.",
    detail:
      "The arch is deliberately awkward to walk: you slow down, look at your feet, then look up — and the view has changed. On a windless morning the arch and its reflection meet to form a full circle, which is the single most photographed frame in the garden.",
  },
  {
    id: "lantern-walk",
    title: "The lantern walk",
    japanese: "灯籠 · tōrō",
    icon: "lamp",
    blurb: "Stone lanterns punctuate the circuit path, marking turns and water's edge.",
    detail:
      "Lanterns are never scattered at random. Each one sits where the path changes its mind — at a fork, at a step down to the water, at the point where the pond first comes into full view. They are markers of attention as much as light.",
  },
  {
    id: "tea-pavilion",
    title: "The pavilion",
    japanese: "東屋 · azumaya",
    icon: "house",
    blurb: "An open, hip-roofed shelter sited for the long view back across the pond.",
    detail:
      "The pavilion is placed where the composition is most complete: pond, bridge, cascade and the far tree line stacked in one frame. Sit for ten minutes here and the garden does the rest — this is the spot that most reliably converts a quick walk into a long one.",
  },
  {
    id: "koi-pond",
    title: "The pond & islands",
    japanese: "池泉 · chisen",
    icon: "fish",
    blurb: "The central pond, its planted islets and the koi that patrol the shallows.",
    detail:
      "The pond is the garden's whole argument in one shape: an irregular edge so you can never see all of it at once, islands that hide the far bank, and shallows warm enough for koi to gather where visitors stand. Its outline is what makes ten acres feel much larger.",
  },
  {
    id: "bamboo-grove",
    title: "The bamboo grove",
    japanese: "竹林 · chikurin",
    icon: "sprout",
    blurb: "A dense green corridor that screens the city out and cools the air noticeably.",
    detail:
      "The grove does the unglamorous work of the garden — it hides Sinhagad Road. Walk into it and traffic noise drops to a rustle within a few paces, which is precisely the effect a borrowed-scenery garden is designed to produce.",
  },
];

export const GARDEN_STATS: { label: string; value: string; note: string }[] = [
  { label: "Area", value: "10 acres", note: "One of Asia's largest Japanese-style gardens" },
  { label: "Opened", value: "2013", note: "Officially the Pu La Deshpande Udyan" },
  { label: "Modelled on", value: "Kōrakuen", note: "Okayama's garden, laid out 1687–1700" },
  { label: "Typical visit", value: "1–1.5 hrs", note: "Longer if you sit at the pavilion" },
];

export const GARDEN_STORY: { heading: string; body: string }[] = [
  {
    heading: "Two cities, one garden",
    body: "Pune and Okayama are sister cities, and this garden is the friendship written in stone and water. It is modelled on Kōrakuen — the 17th-century garden laid out for the lord of Okayama between 1687 and 1700, and counted among the three great gardens of Japan. What stands on Sinhagad Road is not a copy but a translation: the same grammar of pond, path, bridge and borrowed view, rewritten for Deccan light, Deccan rock and Deccan rain.",
  },
  {
    heading: "Named for a Marathi voice",
    body: "Its official name honours P. L. Deshpande — 'Pu La' — the writer, humourist and musician whose essays and stage performances shaped how a generation of Maharashtra laughed at itself. A garden built on borrowed Japanese form, carrying a Marathi name, beside the Mutha: it is a very Pune object.",
  },
  {
    heading: "How to read it",
    body: "This is a kaiyū-shiki, a stroll garden. There is no viewing platform and no single correct vantage point — the design assumes you are walking, and it withholds and reveals the pond as you go. Follow the circuit path rather than cutting across the lawns, and let the garden meter itself out: cascade, then water, then bridge, then the long view back.",
  },
];

export const GARDEN_ETIQUETTE: string[] = [
  "Walk the circuit path — lawns and rockeries are planting, not seating.",
  "Feeding the koi is discouraged; the pond is stocked and managed.",
  "Tripods and pre-wedding shoots usually need prior permission from the garden office.",
  "Carry your litter out — there are bins only near the entrance.",
];

export const GARDEN_FAQS: { q: string; a: string }[] = [
  {
    q: "What is the best time of day to visit?",
    a: "The 6:00–10:30 AM window is cooler, quieter and better for photographs. Evenings from 4:00 PM are prettier in low light but noticeably busier, especially on weekends.",
  },
  {
    q: "Is the Pune-Okayama Friendship Garden the same as Pu La Deshpande Udyan?",
    a: "Yes. Pu La Deshpande Udyan is the official name; almost everyone in Pune calls it the Okayama Friendship Garden or simply the Japanese garden.",
  },
  {
    q: "How long should I plan for?",
    a: "About an hour covers the full circuit at a walking pace. Budget 90 minutes if you intend to photograph the bridge or sit at the pavilion.",
  },
  {
    q: "Is it suitable for children and elderly visitors?",
    a: "Mostly yes — the circuit path is paved and gently graded. The arched bridge is steep, but there are flat crossings and level routes around it.",
  },
  {
    q: "Is there anything else nearby worth pairing with it?",
    a: "Saras Baug and Parvati Hill are both a short drive away, which makes a natural half-day: garden first thing in the morning, then Parvati's steps before the sun gets high.",
  },
];
