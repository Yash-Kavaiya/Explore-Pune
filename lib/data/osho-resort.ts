/**
 * Editorial content for the Osho International Meditation Resort detail page.
 *
 * `OSHO_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/osho/osho-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type OshoFeature = {
  id:
    | "welcome-gate"
    | "pyramid"
    | "zen-garden"
    | "swimming-pool"
    | "teerth-park"
    | "evening-celebration";
  title: string;
  /** Subtitle — a short descriptor for the element. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const OSHO_FEATURES: OshoFeature[] = [
  {
    id: "welcome-gate",
    title: "The Welcome Gate",
    marathi: "Koregaon Park entrance",
    icon: "door-open",
    blurb: "The quiet threshold where the city's noise drops away at the bamboo line.",
    detail:
      "The resort sits behind the green walls of Koregaon Park, and the welcome gate is where the transition happens: traffic hush gives way to birdsong, and the path narrows into a bamboo-shaded walkway. Visitors register here, pick up the maroon robe that campus tradition asks for inside the meditation halls, and leave the city's pace at the turnstile.",
  },
  {
    id: "pyramid",
    title: "The Pyramid Auditorium",
    marathi: "Gautama the Buddha Auditorium",
    icon: "gem",
    blurb: "The striking black pyramid where the big silent sittings and evening events happen.",
    detail:
      "The black pyramid is the campus landmark — a vast, hushed auditorium where hundreds sit in silence for the daily meditations and the evening celebration. Its geometry is deliberate: a pyramid focuses the room toward a single still point. Inside, shoes are off, voices are off, and the only light gathers at the centre of the floor. Even from outside, its dark planes anchor the whole campus.",
  },
  {
    id: "zen-garden",
    title: "The Zen Garden",
    marathi: "Raked gravel & stone",
    icon: "sprout",
    blurb: "Raked gravel, standing stones and clipped green — the resort's contemplative heart.",
    detail:
      "Behind the auditorium the campus softens into a Zen garden: raked gravel fields, standing stones placed with deliberate asymmetry, mossy lanterns and low clipped hedges. It is designed for slow walking — the gravel's rake lines pull the eye in circles around the stones, and benches sit exactly where the composition wants you to stop. Early morning, before the programmes begin, it is the quietest place in Koregaon Park.",
  },
  {
    id: "swimming-pool",
    title: "The Swimming Pool",
    marathi: "The lagoon deck",
    icon: "droplets",
    blurb: "A calm blue deck where meditators swim between sessions.",
    detail:
      "The resort's pool is less a sports facility than a floating meditation: a clean blue rectangle ringed by palms and a teak deck, open to resident guests between programme hours. In the late afternoon the light comes through the trees in shafts and the water goes glassy. It captures the resort's whole proposition — contemplative practice with modern, unashamed comfort.",
  },
  {
    id: "teerth-park",
    title: "Osho Teerth Park",
    marathi: "Streams, bamboo & falls",
    icon: "trees",
    blurb: "The free public garden next door — streams, bamboo groves and small waterfalls.",
    detail:
      "Adjoining the resort, Osho Teerth is a beautifully landscaped public park built on a reclaimed nullah: a chain of ponds and small waterfalls linked by a stream, crossed by wooden bridges and shaded by bamboo and rain trees. It is free to enter and open mornings and evenings, and for most Punekars it is the Osho experience — a ten-minute walk that feels a hundred kilometres from the city.",
  },
  {
    id: "evening-celebration",
    title: "The Evening Celebration",
    marathi: "Music, dance & silence",
    icon: "music",
    blurb: "Every dusk the campus gathers for the signature evening event — music, then silence.",
    detail:
      "The day's axis is the evening celebration: as the light fails, the campus paths light up, live music builds inside the pyramid, and the gathering moves from dancing to utter stillness. It is the ritual the resort is known for worldwide, and even from the garden you feel it — the paths glow, the pyramid seems to breathe light at its seams, and then the whole campus goes quiet at once.",
  },
];

export const OSHO_STATS: { label: string; value: string; note: string }[] = [
  { label: "Campus", value: "≈ 40 acres", note: "In the green heart of Koregaon Park" },
  { label: "Founded", value: "1974", note: "Osho ashram established in Pune" },
  { label: "Teerth Park", value: "Free", note: "Open mornings & evenings to all" },
  { label: "Evening event", value: "Daily", note: "Celebration at the pyramid auditorium" },
];

export const OSHO_STORY: { heading: string; body: string }[] = [
  {
    heading: "An ashram grows in Koregaon Park",
    body:
      "In 1974 the mystic Osho set up his ashram in two bungalows in Koregaon Park, then a quiet outskirt of Pune. Seekers arrived from every continent, and the ashram grew into a self-contained world: meditation halls, gardens, kitchens, and the black pyramid auditorium that still defines the skyline of the lane. Through the commune years, the Oregon interlude and Osho's return, the Pune campus remained the movement's centre of gravity — and after his death in 1990 it was re-imagined as the Osho International Meditation Resort, trading the word ashram for something between a retreat and a spa.",
  },
  {
    heading: "Meditation with air conditioning",
    body:
      "The resort's bet was that contemplation and comfort are not enemies. Maroon robes, silence and hour-long sittings coexist with a beautiful pool, tennis courts, a good café and espresso. That mix made it one of the most unusual destinations in India — part spiritual centre, part design hotel — and it pulled Pune onto the itinerary of a global subculture. Love it or puzzle over it, the campus is impeccably kept: every hedge clipped, every path swept, every evening programme run on time for fifty years.",
  },
  {
    heading: "The park that belongs to everyone",
    body:
      "If the resort itself is gated and paid, Osho Teerth is its gift to the city. Created in the 1990s on a stretch of reclaimed, polluted nullah land, the park chains ponds, waterfalls and bamboo groves along a stream bed and opens it all for free. Morning walkers, couples, birders and grandparents with toddlers share the bridges. It is one of Pune's most-loved public spaces — and the surest proof that the lane's strangeness has always had a generous side.",
  },
];

export const OSHO_ETIQUETTE: string[] = [
  "The resort is a private campus — check the official site for current entry rules, passes and timings before you go.",
  "Inside the meditation halls, silence and the maroon robe are part of the tradition; day visitors follow the welcome team's guidance.",
  "Photography is restricted inside the resort; Osho Teerth park next door is fine for photos.",
  "Osho Teerth park is free and open in the mornings and evenings — keep it quiet; people come here to slow down.",
  "No food or smoking inside either the campus or the park.",
  "The lanes of Koregaon Park are residential — keep voices low outside the gates too.",
];

export const OSHO_FAQS: { q: string; a: string }[] = [
  {
    q: "Can anyone visit the resort, or do you have to join a programme?",
    a:
      "The resort is a private campus and entry is by registration/pass, with rules that change — check the official site before planning. The easiest way to experience the place without a pass is Osho Teerth, the beautiful free public park right next door, open mornings and evenings.",
  },
  {
    q: "What is Osho Teerth park, and is it really free?",
    a:
      "Yes. Osho Teerth is a landscaped public park adjoining the resort — a chain of ponds, streams, small waterfalls and bamboo groves built on reclaimed nullah land in the 1990s. It is free to enter, open roughly 6–9 AM and 4–8 PM (timings vary), and is one of Pune's most peaceful walks.",
  },
  {
    q: "Is the black pyramid open to visitors?",
    a:
      "The pyramid is the resort's main auditorium and is used for the campus's meditation programmes, including the daily evening celebration. Access is tied to campus registration; casual tourists can't wander in. You can, however, see its striking exterior from the Teerth park side.",
  },
  {
    q: "Do I need to follow any dress code?",
    a:
      "For the resort's meditation halls the tradition is a maroon robe, available on campus after registration. For simply walking Koregaon Park or Osho Teerth, normal modest clothing is fine — comfortable shoes recommended.",
  },
  {
    q: "What can I combine it with nearby?",
    a:
      "Koregaon Park's cafés and the German Bakery are a short walk away, and Aga Khan Palace — with its Gandhi memorial and its own 3D experience on this site — is about 2 km north. The two make a natural half-day: palace in the morning, Teerth park at dusk.",
  },
];
