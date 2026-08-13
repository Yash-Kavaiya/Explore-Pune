/**
 * Editorial content for the National War Memorial Southern Command page.
 *
 * `MEMORIAL_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/memorial/memorial-world.ts) — the HTML feature list and
 * the WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type MemorialFeature = {
  id:
    | "memorial-column"
    | "eternal-flame"
    | "armor-park"
    | "mig-23bn"
    | "ins-trishul"
    | "command-museum";
  title: string;
  /** Marathi term for the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const MEMORIAL_FEATURES: MemorialFeature[] = [
  {
    id: "memorial-column",
    title: "The memorial column",
    marathi: "स्मारक स्तंभ · Smārak Stambha",
    icon: "landmark",
    blurb: "A 25-metre stone column at the heart of the grounds — the tallest mark on the lawn.",
    detail:
      "Raised in the centre of a circular plaza, the column is the memorial's signature: a tapering shaft about 25 metres high, standing on a stepped plinth ringed by marble name-walls. The names are those of post-Independence martyrs of the three services who hailed from Maharashtra. You read them walking the circle, then look up — the shaft is the first thing visible from the gate.",
  },
  {
    id: "eternal-flame",
    title: "The eternal flame",
    marathi: "अमर ज्योत · Amar Jyot",
    icon: "flame",
    blurb: "A bowl of fire at the foot of the column, kept burning for the fallen.",
    detail:
      "Just in front of the shaft, inside the same plaza, a shallow stone bowl holds the eternal flame. It is the quiet centre of a visit — families pause here, school groups go still, and on national days the flame is the focus of wreaths. In the model it sits at the column's feet, not off in a side court, because that is how the real memorial is arranged.",
  },
  {
    id: "armor-park",
    title: "Tanks and artillery",
    marathi: "रणगाडे · Raṇgāḍe",
    icon: "shield",
    blurb: "Decommissioned armour on the lawn — a Vijayanta and field guns that actually served.",
    detail:
      "West of the plaza the grass becomes an open-air armour park. A Vijayanta battle tank — the kind that fought in 1965, 1971 and later campaigns — sits on a concrete pad with its barrel still trained, and field guns and howitzers stand in a loose line beside it. Children climb the viewing step; veterans point at details. These are not replicas. They are retired Southern Command hardware, parked where a garden would otherwise be.",
  },
  {
    id: "mig-23bn",
    title: "The MiG-23BN",
    marathi: "मिग-२३ · Mig-23",
    icon: "plane",
    blurb: "A swing-wing fighter that flew in Kargil, now parked on the eastern lawn.",
    detail:
      "Since December 2009 a MiG-23BN (SM273) has stood on a pad east of the column. It was one of the last flyable aircraft of No. 221 Squadron before the type was phased out, and it flew combat in the Kargil War. The variable-geometry wings, the long nose and the tall tail make it unmistakable — the memorial's most photographed exhibit after the column itself.",
  },
  {
    id: "ins-trishul",
    title: "INS Trishul replica",
    marathi: "त्रिशूल · Triśūl",
    icon: "ship",
    blurb: "A scale frigate that stands for the Navy's share of the tri-services memorial.",
    detail:
      "Behind the plaza, on the garden side, sits a replica of INS Trishul — the Whitby-class frigate that served in the Liberation of Goa and the 1971 war, now long decommissioned. The real ship is gone; this hull, superstructure and mast are here so the memorial is not only an Army and Air Force story. Southern Command is a joint formation, and Trishul is how the Navy is present on the lawn.",
  },
  {
    id: "command-museum",
    title: "The Southern Command Museum",
    marathi: "दक्षिण कमान संग्रहालय · Dakṣiṇ Kamān Saṅgrahālaya",
    icon: "house",
    blurb: "A low museum block in the gardens — uniforms, guns, and the history of the Command.",
    detail:
      "At the far end of the grounds a modest building holds the Southern Command Museum: uniforms, ammunition, vehicles, the battles the Command has fought and the honours it has won. Around it the 2008 landscaping — new lawns and visitor paths — turns the campus into a garden as well as a parade ground. The weekend sound-and-light show is staged on these same lawns, with the column as the screen.",
  },
];

export const MEMORIAL_STATS: { label: string; value: string; note: string }[] = [
  { label: "Dedicated", value: "15 Aug 1998", note: "Raised by citizens, unveiled on Independence Day" },
  { label: "Column", value: "25 metres", note: "Central shaft over a circular name-wall" },
  { label: "Command", value: "Southern", note: "Indian Army Southern Command, Ghorpadi" },
  { label: "Show", value: "Fri–Sun", note: "Sound-and-light on the weekend evenings" },
];

export const MEMORIAL_STORY: { heading: string; body: string }[] = [
  {
    heading: "A memorial the city built",
    body:
      "This is the only war memorial in South Asia raised by citizens' contributions rather than a government works programme. Neighbours, veterans' families and the armed forces together funded a campus in Ghorpadi, and on 15 August 1998 it was dedicated to post-Independence martyrs of the Army, Navy and Air Force who hailed from Maharashtra. The marble around the column is a roll of those names. It is not a colonial cenotaph reused; it is a late-1990s civic act, still tended by the Southern Command and the cantonment.",
  },
  {
    heading: "Southern Command, in the open air",
    body:
      "Pune is the seat of the Indian Army's Southern Command, and the memorial is its public face. A 25-metre column stands in a circular plaza with an eternal flame at its foot. Around the lawns the Command has parked the hardware of its own story: a Vijayanta and field guns, a MiG-23BN that flew in Kargil, and a replica of INS Trishul from Goa and 1971. The Southern Command Museum, in a low block at the back of the garden, keeps the uniforms, maps and citations that will not sit outside.",
  },
  {
    heading: "Evenings of sound and light",
    body:
      "On Friday, Saturday and Sunday the grounds become a theatre. A sound-and-light show plays against the column and the hardware, telling the same post-Independence story the marble already lists. Come in daylight to walk the tanks and the MiG; stay, or return at dusk, when the flame and the floodlit shaft carry the visit. The show is why the 3D model has a ceremonial evening as well as an ordinary afternoon.",
  },
];

export const MEMORIAL_ETIQUETTE: string[] = [
  "This is a living memorial — keep voices low at the column and the eternal flame.",
  "Do not climb the tanks, guns, aircraft or the Trishul replica; use the viewing steps.",
  "Photography is welcome on the grounds; be respectful around wreath ceremonies.",
  "Dress modestly on national days and during the sound-and-light show.",
  "The flame bowl and the name-walls are not seating — walk the circle, do not sit on the marble.",
  "The weekend show has its own ticket window; arrive early on public holidays.",
];

export const MEMORIAL_FAQS: { q: string; a: string }[] = [
  {
    q: "Who built the National War Memorial in Pune?",
    a: "Citizens, together with the armed forces. It is the only war memorial in South Asia raised by public contribution. It was unveiled on 15 August 1998 and honours post-Independence martyrs of the three services from Maharashtra.",
  },
  {
    q: "What is the tall column?",
    a: "A stone memorial shaft about 25 metres high, standing in a circular plaza. Marble around the base carries the names of the fallen. An eternal flame burns at its foot.",
  },
  {
    q: "What can I see besides the column?",
    a: "An open-air display of Southern Command hardware: tanks and artillery (including a Vijayanta), a MiG-23BN fighter that flew in the Kargil War, a replica of the frigate INS Trishul, and the Southern Command Museum in the gardens.",
  },
  {
    q: "Is there a sound-and-light show?",
    a: "Yes — every Friday, Saturday and Sunday evening. The show is staged on the lawns with the column as the backdrop. Check the ticket window for the current timing when you visit.",
  },
  {
    q: "How long should I spend here?",
    a: "Forty-five minutes to an hour covers the plaza, the flame, the armour park, the MiG and the museum. Pair it with Empress Garden or Aga Khan Palace, both a short drive away in east Pune.",
  },
];
