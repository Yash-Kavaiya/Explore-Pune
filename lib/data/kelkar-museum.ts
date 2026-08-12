/**
 * Editorial content for the Raja Dinkar Kelkar Museum detail page.
 *
 * `MUSEUM_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/kelkar/museum-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type MuseumFeature = {
  id:
    | "mastani-mahal"
    | "lamps-gallery"
    | "musical-instruments"
    | "betel-cutters"
    | "carved-doors"
    | "armoury";
  title: string;
  /** Marathi/English label for the gallery or chamber. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const MUSEUM_FEATURES: MuseumFeature[] = [
  {
    id: "mastani-mahal",
    title: "Mastani Mahal",
    marathi: "मस्तानी महाल · The reconstructed chamber",
    icon: "sparkles",
    blurb: "A full-scale reconstruction of Mastani's chamber — the museum's most theatrical stop.",
    detail:
      "On the upper floor the museum rebuilds the private apartments associated with Mastani, the companion of Peshwa Baji Rao I. Carved teak screens, painted niches, a low platform and hanging brass lamps recreate the intimate scale of a Peshwa-era mahal. It is not a palace wing you can enter elsewhere in Pune; it is a stage set built from the collection itself, and the room most visitors remember.",
  },
  {
    id: "lamps-gallery",
    title: "The lamps gallery",
    marathi: "दिवे · Deep · Brass and stone lamps",
    icon: "lamp",
    blurb: "Hundreds of deep and samai — from palm-sized to temple-scale — fill the shelves.",
    detail:
      "Dr. Kelkar collected lamps the way others collect coins: by region, by fuel type, by the animal or deity that crowns the stem. You will see hanging temple deepmalas, peacock-finialed table lamps, and stone oil wells worn smooth by decades of use. In low evening light the brass still throws the same warm disc it did in a courtyard a century ago.",
  },
  {
    id: "musical-instruments",
    title: "Musical instruments",
    marathi: "वाद्ये · Vādye",
    icon: "music",
    blurb: "Tabla, sitar, veena, shehnai and folk drums — craftsmanship you can almost hear.",
    detail:
      "The instrument cases hold the grammar of Indian classical and folk sound: paired tabla with their goat-skin heads, long-necked string instruments with gourd resonators, and shehnai with their reed mouthpieces. Many are decorated far beyond function — ivory inlays, painted gourds, silver frets — because a court instrument was also a piece of furniture for the eye.",
  },
  {
    id: "betel-cutters",
    title: "Betel-nut cutters",
    marathi: "सुपारी कातर · Supari cutters",
    icon: "gem",
    blurb: "An entire case of ornate nutcrackers — the museum's most unexpectedly famous collection.",
    detail:
      "The kelkar betel-nut cutters are a cult object among visitors. Dozens of hinged steel blades, each handled in brass, ivory, wood or silver, take the form of birds, fish, mythological figures and abstract scrolls. They document a social habit — the shared paan tray — through pure material culture. Give this case five quiet minutes; it rewards close looking.",
  },
  {
    id: "carved-doors",
    title: "Carved doors & frames",
    marathi: "लाकडी दरवाजे · Teak doorways",
    icon: "door-open",
    blurb: "Full-height wooden door leaves and lintels salvaged from wadas across Maharashtra.",
    detail:
      "Standing against the walls are complete door assemblies: double leaves, carved jambs, and the heavy lintel that once sat over a wada entrance. Peacocks, lotuses, Ganesha panels and geometric jali work show how domestic architecture in the Deccan was never plain. The doors are among the largest objects in the building — you feel their weight even behind the rope.",
  },
  {
    id: "armoury",
    title: "Arms, armour & vessels",
    marathi: "शस्त्रागार · Arms and metalwork",
    icon: "shield",
    blurb: "Swords, shields, ceremonial vessels and small sculptures from courts and kitchens.",
    detail:
      "One wing gathers the metalwork of status and daily life together: curved talwars, studded shields, ritual lotas and massive cooking vessels, plus small stone and bronze figures. It is the counterweight to the delicate lamps and cutters — a reminder that the same craft tradition forged both a paan tray and a battlefield blade.",
  },
];

export const MUSEUM_STATS: { label: string; value: string; note: string }[] = [
  { label: "Objects", value: "~20,000", note: "Everyday and ceremonial Indian life" },
  { label: "Founded", value: "1962", note: "Gift of Dr. Dinkar G. Kelkar" },
  { label: "Floors", value: "3", note: "Galleries packed wall to wall" },
  { label: "Signature", value: "Mastani Mahal", note: "Reconstructed Peshwa-era chamber" },
];

export const MUSEUM_STORY: { heading: string; body: string }[] = [
  {
    heading: "One man's lifelong collection",
    body: "Dr. Dinkar Gangadhar Kelkar spent decades gathering the ordinary beautiful things of pre-industrial India — not royal jewels, but lamps, cutters, doors, instruments, toys and kitchenware. He dedicated the museum to his son Raja, and the result is less a chronological survey than a love letter to craft: objects that people used every day, elevated by the skill of the hand that made them.",
  },
  {
    heading: "A wada of rooms, not a white cube",
    body: "The museum occupies a multi-storey building in Shukrawar Peth, and it still feels like a house that filled up with treasures. Cases stand close; carved doors lean against walls; the Mastani Mahal occupies an entire chamber upstairs. You do not walk a single prescribed loop so much as keep finding another room that rewards five more minutes.",
  },
  {
    heading: "How to visit well",
    body: "Start downstairs with the doors and metalwork, climb toward the lamps and instruments, and save the Mastani Mahal for last. An hour is the minimum; ninety minutes lets the betel-cutter case and the brass lamps do their work. Photography rules vary by gallery — ask at the desk — and the building has stairs, so plan accordingly if mobility is a concern.",
  },
];

export const MUSEUM_ETIQUETTE: string[] = [
  "Keep voices low — galleries are small and sound carries between floors.",
  "Do not touch cases, carved doors or hanging lamps; many surfaces are original finish.",
  "Bags may be checked at the entrance; travel light if you can.",
  "Flash photography is often restricted — confirm the current rule at the ticket counter.",
];

export const MUSEUM_FAQS: { q: string; a: string }[] = [
  {
    q: "What should I not miss inside the Kelkar Museum?",
    a: "The Mastani Mahal on the upper floor, the brass lamps gallery, the betel-nut cutter cases, and the full-height carved wooden doors. If time is short, prioritise Mastani Mahal and the cutters — they are unique to this museum.",
  },
  {
    q: "How long does a visit take?",
    a: "Plan 1–1.5 hours. The building is compact but densely packed; rushing past the cases is the usual mistake. Families often stay closer to ninety minutes.",
  },
  {
    q: "Is the museum good for children?",
    a: "Yes, especially older children who enjoy looking closely at objects. The betel cutters, armour and musical instruments tend to hold attention; the Mastani Mahal feels like stepping into a story. Toddlers may find the quiet galleries less engaging.",
  },
  {
    q: "When is the best time to go?",
    a: "Weekday mornings are calmer. The museum is typically open 10:00 AM – 5:30 PM; confirm timings around public holidays. Midday light is fine indoors — the galleries are lit — so heat outside matters more than golden hour.",
  },
  {
    q: "What else can I combine with a visit?",
    a: "Shaniwar Wada and Dagdusheth Halwai Ganapati are both a short ride away in the old city. A natural half-day is Kelkar Museum first, then the fort or temple, with a break for misal or street food in between.",
  },
];
