/**
 * Editorial content for the Aga Khan Palace detail page.
 *
 * `PALACE_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/agakhan/palace-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type PalaceFeature = {
  id:
    | "facade"
    | "arcade"
    | "gandhi-room"
    | "samadhis"
    | "lawns"
    | "museum";
  title: string;
  /** Marathi/Hindi/Urdu name of the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const PALACE_FEATURES: PalaceFeature[] = [
  {
    id: "facade",
    title: "The Italianate facade",
    marathi: "इटालियन सम्मुख · Italian sammukh",
    icon: "landmark",
    blurb: "A stately front of pale stone, tall arches and a deep colonnade.",
    detail:
      "Built in 1892 by Sultan Muhammed Shah Aga Khan III, the palace was conceived as a charitable work — its construction gave employment during a famine. The facade is unmistakably European: a long symmetrical front of rusticated stone, round-headed arches and a projecting central portico, more Tuscan villa than Deccan fortress.",
  },
  {
    id: "arcade",
    title: "The arched arcade",
    marathi: "मेहराबी गलियारा · Meharabi galiyara",
    icon: "route",
    blurb: "Rhythmic round arches run the length of both floors of the front.",
    detail:
      "The palace's signature is its arcade — tall, repeated round arches carried on piers, wrapping the front and sides in deep shade. It is the detail every photograph leads with, and the element that makes the long front feel light despite its size.",
  },
  {
    id: "gandhi-room",
    title: "The Gandhi room",
    marathi: "गांधी खोली · Gandhi kholi",
    icon: "house",
    blurb: "The room where Mahatma Gandhi was held from August 1942.",
    detail:
      "After the Quit India resolution of August 1942, Gandhi, his wife Kasturba and his secretary Mahadev Desai were interned in the palace. Gandhi's room — with his few personal effects — is kept as the heart of the Gandhi National Memorial. It is a plain room carrying a heavy chapter of history.",
  },
  {
    id: "samadhis",
    title: "The samadhis",
    marathi: "समाधी स्थळ · Samadhi sthal",
    icon: "sparkles",
    blurb: "Memorials to Kasturba Gandhi and Mahadev Desai in the grounds.",
    detail:
      "Both Kasturba Gandhi (in February 1944) and Mahadev Desai (in August 1942) died during their internment, and their samadhis stand in the palace grounds. Gandhi's ashes were also kept here before immersion. The quiet, tree-shaded memorials are the most moving part of a visit.",
  },
  {
    id: "lawns",
    title: "The lawns & gardens",
    marathi: "बागीचा · Bagicha",
    icon: "trees",
    blurb: "Sweeping lawns and mature trees surround the palace on all sides.",
    detail:
      "The palace stands in wide, well-kept grounds — broad lawns, flowering beds and old trees that soften the stone front. The grounds are as much the experience as the building; allow time simply to walk them.",
  },
  {
    id: "museum",
    title: "The memorial museum",
    marathi: "स्मारक संग्रहालय · Smarak sangrahalaya",
    icon: "palette",
    blurb: "Photographs, letters and personal effects of the Gandhi years.",
    detail:
      "Inside, the Gandhi National Memorial Society maintains a museum of the freedom-struggle years: photographs, letters, and objects associated with Gandhi, Kasturba and Desai. The palace is also the headquarters of the Gandhi Smarak Nidhi, the trust that carries the memorial forward.",
  },
];

export const PALACE_STATS: { label: string; value: string; note: string }[] = [
  { label: "Built", value: "1892", note: "By Sultan Muhammed Shah Aga Khan III" },
  { label: "The internment", value: "1942–44", note: "Gandhi, Kasturba & Mahadev Desai held here" },
  { label: "The samadhis", value: "Two", note: "Kasturba Gandhi and Mahadev Desai" },
  { label: "Today", value: "Memorial", note: "Gandhi National Memorial & Smarak Nidhi HQ" },
];

export const PALACE_STORY: { heading: string; body: string }[] = [
  {
    heading: "A palace built as charity",
    body: "Sultan Muhammed Shah Aga Khan III, the 48th Imam of the Nizari Ismailis, commissioned the palace in 1892. Its construction was itself an act of relief — it gave paid work to local people during a famine. The result is one of Pune's grandest buildings: a long, symmetrical, unmistakably Italianate front of pale stone and round arches, standing in deep lawns off Nagar Road.",
  },
  {
    heading: "The Quit India years",
    body: "In August 1942, after the Congress passed the Quit India resolution, the British interned Mahatma Gandhi here, together with his wife Kasturba and his secretary Mahadev Desai. It was not a prison cell but a palace under guard — yet the internment turned the building into a site of national memory. Desai died within days; Kasturba died here in February 1944.",
  },
  {
    heading: "A living memorial",
    body: "After independence the palace became the Gandhi National Memorial. Gandhi's ashes were kept here before immersion, and the samadhis of Kasturba and Desai stand in the grounds. Today the palace houses a museum of the freedom-struggle years and serves as the headquarters of the Gandhi Smarak Nidhi — a graceful building carrying one of the heaviest chapters of the century.",
  },
];

export const PALACE_ETIQUETTE: string[] = [
  "This is a place of national memory — keep voices low inside the memorial and museum.",
  "Photography is welcome in the grounds; be respectful around the samadhis.",
  "The lawns are inviting but the interiors have little seating — carry water in summer.",
  "It is a protected monument; drones and professional shoots need prior permission.",
];

export const PALACE_FAQS: { q: string; a: string }[] = [
  {
    q: "Why is Aga Khan Palace famous?",
    a: "Two reasons. Architecturally it is one of Pune's finest buildings — an Italianate palace of arches and lawns built in 1892. Historically it is where Mahatma Gandhi, Kasturba Gandhi and Mahadev Desai were interned from 1942 after the Quit India resolution; both Kasturba and Desai died in captivity here, and their memorials stand in the grounds.",
  },
  {
    q: "Can you go inside the palace?",
    a: "Yes — part of the palace is open as the Gandhi National Memorial museum, with photographs, letters and personal effects, and the room where Gandhi was held. Some sections remain offices of the Gandhi Smarak Nidhi and are not open to visitors.",
  },
  {
    q: "How much time does a visit need?",
    a: "An hour to ninety minutes is comfortable: the museum and Gandhi room, the samadhis in the grounds, and time to walk the lawns and photograph the facade.",
  },
  {
    q: "Is it suitable for children and families?",
    a: "Yes. The grounds are open and easy to walk, and the story is told simply. It works well as a calm, educational stop — though younger children may find the museum quiet compared to a fort or garden.",
  },
  {
    q: "What can I combine it with?",
    a: "It sits on Nagar Road in Yerawada, so it pairs naturally with the Osho Meditation Resort nearby and the Empress Garden a short drive away — an easy east-Pune half day.",
  },
];
