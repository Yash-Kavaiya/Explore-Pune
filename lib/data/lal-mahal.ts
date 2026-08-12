/**
 * Editorial content for the Lal Mahal detail page.
 *
 * `LAL_MAHAL_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/lalmahal/mahal-world.ts) — keep the ids in sync.
 */

export type LalMahalFeature = {
  id:
    | "red-palace"
    | "jijabai-wing"
    | "shaista-hall"
    | "gallery"
    | "garden"
    | "entrance";
  title: string;
  marathi: string;
  icon: string;
  blurb: string;
  detail: string;
};

export const LAL_MAHAL_FEATURES: LalMahalFeature[] = [
  {
    id: "red-palace",
    title: "The Red Palace",
    marathi: "लाल महाल · Lal Mahal",
    icon: "landmark",
    blurb: "A faithful red-brick reconstruction of Shivaji’s childhood home.",
    detail:
      "Originally built around 1630 by Shahaji Bhosale for Jijabai and young Shivaji, the Lal Mahal (‘Red Palace’) was the boy’s home in Pune. The structure you see today is a modern reconstruction in characteristic red brick — modest compared with Shaniwar Wada next door, but the name and the colour still mark the place where the founder of the Maratha Empire grew up.",
  },
  {
    id: "jijabai-wing",
    title: "Jijabai’s wing",
    marathi: "जिजाबाई · Rajmata Jijabai",
    icon: "house",
    blurb: "Where Rajmata Jijabai raised the young Shivaji.",
    detail:
      "Shahaji left his wife and son in Pune while he served elsewhere. Jijabai’s presence here is the emotional centre of the site: the rooms and courtyards stand for a childhood shaped by her discipline, devotion, and political instinct. Walk the wing with that story in mind — the building is simple; the memory is not.",
  },
  {
    id: "shaista-hall",
    title: "The Shaista Khan night",
    marathi: "शैस्ता खान · The raid of 1663",
    icon: "shield",
    blurb: "Where Shivaji’s famous night raid on Shaista Khan is remembered.",
    detail:
      "In 1663 Shivaji led a daring night attack on the Mughal general Shaista Khan, who was lodged in Pune. Tradition places the drama in and around this palace: cut fingers, a hurried escape, and a humiliation that stung the empire. Large oil paintings and dioramas inside retell the encounter — one of the most dramatic Maratha stories attached to a single building.",
  },
  {
    id: "gallery",
    title: "Paintings & dioramas",
    marathi: "चित्रदालन · Chitra-dalan",
    icon: "palette",
    blurb: "Oil paintings and scene models of Maratha turning points.",
    detail:
      "The reconstruction houses large narrative paintings and three-dimensional dioramas of key episodes — childhood, raids, and court moments. They are not a full museum wing like Kelkar’s, but they give the visit its educational spine: a short, visual walk through why this red house matters.",
  },
  {
    id: "garden",
    title: "Garden & grounds",
    marathi: "उद्यान · Jijamata Udyan edge",
    icon: "trees",
    blurb: "A modest garden court — calm pause beside the old city.",
    detail:
      "Outside the palace sits a small garden area, with Jijamata Udyan close by. Families often rest here after Shaniwar Wada. It is not a botanical garden, but the greenery softens the brick and makes a short visit feel complete — especially for children who have had their fill of walls and history indoors.",
  },
  {
    id: "entrance",
    title: "Kasba Peth entrance",
    marathi: "कसबा पेठ · Approach & visit",
    icon: "door-open",
    blurb: "The street approach in Kasba Peth, five minutes from Shaniwar Wada.",
    detail:
      "Lal Mahal sits in dense Kasba Peth, a short walk from Shaniwar Wada and the Dagdusheth temple. Entry is nominal, timings are split (morning and late afternoon), and 30–45 minutes is enough. Pair it with the fort and temple for a classic old-city half day.",
  },
];

export const LAL_MAHAL_STATS: { label: string; value: string; note: string }[] = [
  { label: "Built", value: "c. 1630", note: "By Shahaji Bhosale for Jijabai & Shivaji" },
  { label: "Today", value: "Reconstruction", note: "Red-brick palace with paintings & dioramas" },
  { label: "Famous for", value: "1663", note: "Shaista Khan night raid memory" },
  { label: "Visit", value: "30–45 min", note: "Nominal fee · combine with Shaniwar Wada" },
];

export const LAL_MAHAL_STORY: { heading: string; body: string }[] = [
  {
    heading: "A boy’s house that became a legend",
    body: "Shahaji Bhosale built the original Lal Mahal so that his wife Jijabai and young son Shivaji could live in Pune while he was away on service. The house was red — lal — and relatively modest. What made it immortal was not scale but story: this is where the future Chhatrapati spent formative years under Jijabai’s care, learning the politics of the Deccan from the inside.",
  },
  {
    heading: "The night of Shaista Khan",
    body: "In 1663 Shivaji struck at Shaista Khan, the Mughal governor camping in Pune. The raid became folklore — fingers severed, a general shamed, a Maratha reputation sharpened. Whether every detail of the chamber-by-chamber retelling is exact matters less than the fact that visitors still come to this red palace to stand near that memory. The paintings and dioramas inside keep the night alive for school groups and travellers alike.",
  },
  {
    heading: "A reconstruction worth the walk",
    body: "The present building is a reconstruction, not the original timber and brick of the 17th century. It is small, clear, and honest about its purpose: a memorial stop on the old-city circuit. Come from Shaniwar Wada, spend half an hour with the red walls and the gallery, sit in the garden, then continue to Dagdusheth. You will leave knowing why Pune still points to this corner when it talks about Shivaji’s childhood.",
  },
];

export const LAL_MAHAL_ETIQUETTE: string[] = [
  "This is a historical memorial with paintings inside — keep voices moderate and bags off the displays.",
  "Photography rules can vary by room; follow on-site signs around the gallery.",
  "Combine with Shaniwar Wada on foot; do not leave vehicles blocking the narrow Kasba Peth lanes.",
  "The garden is shared with families — pack out snacks and litter.",
  "Timings are split (closed midday) — plan the visit around the morning or late-afternoon window.",
];

export const LAL_MAHAL_FAQS: { q: string; a: string }[] = [
  {
    q: "Is today’s Lal Mahal the original 1630 building?",
    a: "No. The palace you visit is a red-brick reconstruction that commemorates Shivaji’s childhood home. The original fabric is long gone; the site and the story remain.",
  },
  {
    q: "What is Lal Mahal famous for?",
    a: "Two intertwined threads: it was the childhood home of Chhatrapati Shivaji Maharaj under Rajmata Jijabai, and it is tied to the famous 1663 night raid on the Mughal general Shaista Khan. Inside, paintings and dioramas retell those moments.",
  },
  {
    q: "How long do I need?",
    a: "Thirty to forty-five minutes is comfortable for the palace, gallery and a short sit in the garden. Many visitors fold it into a longer old-city walk with Shaniwar Wada and Dagdusheth temple.",
  },
  {
    q: "Is it good for children?",
    a: "Yes — the scale is small, the fee is nominal, and the dioramas are easy to follow. Pair it with the garden outside so younger visitors can move between indoor story and outdoor play.",
  },
  {
    q: "What should I combine it with?",
    a: "Shaniwar Wada is about a five-minute walk. Dagdusheth Halwai Ganapati and the Raja Dinkar Kelkar Museum sit on the same old-city circuit for a full half day of history and culture.",
  },
];
