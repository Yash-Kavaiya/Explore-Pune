/**
 * Editorial content for the Empress Garden detail page.
 *
 * `EMPRESS_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/empress/empress-world.ts) — keep the ids in sync.
 */

export type EmpressFeature = {
  id: "old-canopy" | "rolling-lawns" | "rose-garden" | "greenhouse" | "flower-show";
  title: string;
  marathi: string;
  icon: string;
  blurb: string;
  detail: string;
};

export const EMPRESS_FEATURES: EmpressFeature[] = [
  {
    id: "old-canopy",
    title: "The old-growth canopy",
    marathi: "जुने वृक्ष · June Vṛkṣa",
    icon: "trees",
    blurb: "Thirty-nine acres of grand trees — a green lung in Camp, even at midday.",
    detail:
      "Empress Garden is a canopy first. Rain trees, mahogany, palms and fig stand in loose groves around the lawns, older than most of the buildings beside the Race Course. The Agri-Horticultural Society has tended them since 1892. Walk the shade: that is the daily garden, show week or not.",
  },
  {
    id: "rolling-lawns",
    title: "The rolling lawns",
    marathi: "हिरवळ · Hiravaḷ",
    icon: "sprout",
    blurb: "Open grass under the trees — picnic ground, morning walk, and the floor of the show.",
    detail:
      "Between the groves the ground opens into long lawns. Families picnic here; walkers loop the paths before the heat. In January the same grass becomes the floor of the fruit, flower and vegetable exhibition. The lawn is the garden’s public room.",
  },
  {
    id: "rose-garden",
    title: "The rose garden",
    marathi: "गुलाब बाग · Gulāb Bāg",
    icon: "sparkles",
    blurb: "Formal rose beds — hundreds of varieties, the garden’s most photographed corner.",
    detail:
      "A distinct rose garden sits apart from the wilder canopy: concentric beds, labelled bushes, and a crush of colour in winter. The annual show has put six hundred rose varieties on display in past years. Even on an ordinary Tuesday the beds are the one place that still reads as a Victorian botanical garden.",
  },
  {
    id: "greenhouse",
    title: "The greenhouse",
    marathi: "हरितगृह · Haritagṛha",
    icon: "house",
    blurb: "A glazed house of tender plants — the Society’s working glass room.",
    detail:
      "A greenhouse stands among the lawns, a low glass-and-frame volume for plants that will not take Pune’s dry months. It is not a palace orangery. It is a horticultural shed with a transparent roof, the place the Society starts seedlings and holds the more delicate show entries out of the sun.",
  },
  {
    id: "flower-show",
    title: "The flower show",
    marathi: "पुष्प प्रदर्शनी · Puṣpa Pradarśanī",
    icon: "palette",
    blurb: "The annual fruit, flower and vegetable exhibition — tents, stalls, and 1,500 varieties.",
    detail:
      "Every January the Agri-Horticultural Society of Western India stages its fruit, flower and vegetable exhibition on these lawns. Tents go up near the gate, competition benches fill with roses, petunias and marigolds, and Pune treats the garden as a four-day fair. The rest of the year the same ground is just grass. Switch the model to show week to see the tents.",
  },
];

export const EMPRESS_STATS: { label: string; value: string; note: string }[] = [
  { label: "Named for", value: "Victoria", note: "Empress of India — the garden’s official name" },
  { label: "Grounds", value: "39 acres", note: "Camp / Ghorpadi, beside the Race Course" },
  { label: "Steward", value: "Since 1892", note: "Agri-Horticultural Society of Western India" },
  { label: "The show", value: "January", note: "Annual fruit, flower and vegetable exhibition" },
];

export const EMPRESS_STORY: { heading: string; body: string }[] = [
  {
    heading: "A garden named for an empress",
    body:
      "Sir John Malcolm founded the Agri-Horticultural Society of Western India in 1830. The Camp garden that became Empress Botanical Garden was laid out in the 1830s and named for Queen Victoria when she took the title Empress of India. In 1892 the Society took over its management. It is still theirs: 39 acres of trees and lawn next to the Pune Race Course, a British-era green that the city never built over.",
  },
  {
    heading: "Canopy, roses, glass",
    body:
      "What you walk is not a Japanese stroll garden and not a Peshwa tank. It is a horticultural park: old-growth shade, rolling lawns, a formal rose garden, and a working greenhouse. The Society uses the ground to grow, to teach, and once a year to exhibit. Come on an ordinary morning for the trees. Come in late January if you want the colour the photographs promise.",
  },
  {
    heading: "Show week",
    body:
      "The fruit, flower and vegetable exhibition is the garden’s public ritual. Tents, competition benches, plant stalls, and roughly fifteen hundred varieties — including hundreds of roses. For four days the lawns are a fair. Then the canvas comes down and the canopy takes the place back. Pair a visit with the National War Memorial or Aga Khan Palace, both a short drive in east Pune.",
  },
];

export const EMPRESS_ETIQUETTE: string[] = [
  "Stay on the paths in the rose beds — do not pick flowers or step into labelled plots.",
  "The greenhouse is a working house. Keep the door manners: no food, no leaning on the glass.",
  "During the flower show, follow the rope lines around competition benches.",
  "The lawns are for sitting and picnics; carry your rubbish out.",
  "This is a paid garden — keep your ticket. Drones need prior permission.",
  "Morning is cooler under the canopy; the show week afternoons are crowded.",
];

export const EMPRESS_FAQS: { q: string; a: string }[] = [
  {
    q: "Why is it called Empress Garden?",
    a: "It was named in honour of Queen Victoria as Empress of India. The Agri-Horticultural Society of Western India has managed the 39-acre Camp garden since 1892.",
  },
  {
    q: "Is there an entry fee?",
    a: "Yes — a small ticket, typically around ₹15–₹25. Flower-show days have their own (higher) gate charge. Confirm at the ticket window.",
  },
  {
    q: "When is the flower show?",
    a: "Usually late January, for about four days. The Society’s fruit, flower and vegetable exhibition fills the lawns with tents and competition benches. Check the garden’s notices for the current dates.",
  },
  {
    q: "What should I not miss?",
    a: "The old-growth canopy for shade, the formal rose garden, and the greenhouse. If you can time a visit with the January show, do — that is when the garden is at its most public.",
  },
  {
    q: "What can I combine it with?",
    a: "The National War Memorial Southern Command and Aga Khan Palace are both a short drive in east Pune. The Race Course sits next door but is not a public garden walk.",
  },
];
