/**
 * Editorial content for the Saras Baug detail page.
 *
 * `BAUG_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/saras/baug-world.ts) — keep the ids in sync.
 */

export type BaugFeature = {
  id:
    | "talyatla-ganpati"
    | "drained-lawns"
    | "ganesh-museum"
    | "evening-stalls"
    | "parvati-hill";
  title: string;
  marathi: string;
  icon: string;
  blurb: string;
  detail: string;
};

export const BAUG_FEATURES: BaugFeature[] = [
  {
    id: "talyatla-ganpati",
    title: "Talyatla Ganpati",
    marathi: "तळ्यातला गणपती · Taḷyātlā Gaṇpatī",
    icon: "landmark",
    blurb: "The Ganpati of the lake — a modest shrine on the mound that was once an island.",
    detail:
      "Peshwa Balaji Bajirao laid an ornamental lake at the foot of Parvati in the 1750s and set a Ganesh shrine on a small island in it. The name stuck: Talyatla Ganpati, the Ganpati of the lake. The water is gone; the mound remains. You still walk out to the shrine as if you were crossing a tank. It is a working temple, not a monument — lamps, bells, and a steady evening queue.",
  },
  {
    id: "drained-lawns",
    title: "The drained tank",
    marathi: "सुकलेले तळे · Suklele Taḷe",
    icon: "trees",
    blurb: "Twenty-five acres of lawn where Parvati Lake used to sit, ringed by a walking path.",
    detail:
      "The Peshwa lake slowly silted and dried. In the 1960s the Pune Municipal Corporation turned the bed into Saras Baug: a broad, almost circular lawn with a path around the old shoreline. You are walking on a tank. That is why the shrine still sits a little higher than the grass, and why the ground still reads as a bowl when you look down from Parvati.",
  },
  {
    id: "ganesh-museum",
    title: "The Ganesh Darshan museum",
    marathi: "गणेश दर्शन संग्रहालय · Gaṇeś Darśan Saṅgrahālaya",
    icon: "house",
    blurb: "A small 1995 museum of Ganesh idols added to the temple premises.",
    detail:
      "Beside the shrine a low block holds the Shree Ganesh Darshan Sangrahalaya — a few hundred murtis in clay, metal and wood, added in 1995. It is not Kelkar and it is not a palace museum. It is a side room of the temple: compact, a little dim, and the reason families with children stay an extra twenty minutes.",
  },
  {
    id: "evening-stalls",
    title: "The evening stalls",
    marathi: "संध्याकाळची गल्ली · Sandhyākāḷcī Gallī",
    icon: "lamp",
    blurb: "Snack smoke at the gate — bhaji, bhel, kulfi — the reason Pune treats this as an evening.",
    detail:
      "The garden is free and open from before dawn, but it comes alive after five. Carts line the road side of the baug: corn, kanda bhaji, dabeli, ice cream. Families do a slow loop of the path, sit on the lawn, and eat on the way out. Combine it with the climb up Parvati next door and you have the classic south-Pune evening.",
  },
  {
    id: "parvati-hill",
    title: "Parvati next door",
    marathi: "पर्वती · Parvatī",
    icon: "mountain",
    blurb: "The Peshwa hill temple sits immediately above the baug — the two are one outing.",
    detail:
      "Saras Baug was laid at the foot of Parvati so the Peshwas could look down on their lake. The 103 steps of the hill temple start a few minutes’ walk from the garden gate. From the lawn the hill is a dark, stepped mass with the Devdeveshwar cluster on top. Do the baug first, then the climb, or reverse it for sunrise over the old tank.",
  },
];

export const BAUG_STATS: { label: string; value: string; note: string }[] = [
  { label: "Laid out", value: "1750s", note: "Peshwa Balaji Bajirao’s ornamental lake" },
  { label: "The shrine", value: "Talyatla", note: "Ganpati of the lake, still on the old island" },
  { label: "The grounds", value: "25 acres", note: "Drained tank, lawns and a walking path" },
  { label: "Evenings", value: "Family", note: "Free garden, stalls at the gate, Parvati next door" },
];

export const BAUG_STORY: { heading: string; body: string }[] = [
  {
    heading: "A lake, then a garden",
    body:
      "In the 1750s Peshwa Balaji Bajirao had an ornamental lake dug at the foot of Parvati Hill and set a Ganesh shrine on an island in it. For a century the view from the hill was water. The tank silted, the PMC drained and grassed the bed in the 1960s, and the 25-acre bowl became Saras Baug. The shrine kept its name — Talyatla Ganpati — so the lake is still in the language even though you walk on lawn.",
  },
  {
    heading: "The Ganpati of the lake",
    body:
      "The mound in the middle is the old island. A small shikhara, a Nandi-less court, lamps. Maratha commanders once used the isolation of the island for councils away from the Parvati temple. Today it is a neighbourhood ganpati: school shoes at the steps, aarti in the evening, and a 1995 museum of murtis in a side block. You do not come for grandeur. You come because this is where the city still meets its lake-god on a Tuesday.",
  },
  {
    heading: "An evening at the foot of the hill",
    body:
      "The path around the old shoreline fills after five. Stalls smoke at the gate. Children run the lawn that used to be water. Parvati’s steps start next door. That pairing — baug then hill, or hill then baug — is the whole outing. There is no ticket. There is no closing drama. You loop the tank, take darshan, eat bhaji, and look up at the hill you will climb tomorrow.",
  },
];

export const BAUG_ETIQUETTE: string[] = [
  "The shrine is a living temple — shoes off at the steps, shoulders covered, voices low around the sanctum.",
  "The lawn is the old lake bed. Stay on the path if the grass is wet; do not pick flowers from the beds.",
  "Photography of the garden and the hill is welcome; be discreet inside the shrine and the murti museum.",
  "The stalls sit outside the garden gate. Eat there, not on the temple plinth.",
  "Evenings are crowded; keep the circular path moving so walkers can pass.",
  "Pair it with Parvati Hill — the steps start a few minutes from the south gate.",
];

export const BAUG_FAQS: { q: string; a: string }[] = [
  {
    q: "Why is it called Talyatla Ganpati?",
    a: "Talyatla means ‘of the lake’. The shrine was built on an island in a Peshwa-era ornamental lake at the foot of Parvati. The lake was later drained; the name stayed.",
  },
  {
    q: "Is there an entry fee?",
    a: "No. The garden and the temple are free. The small Ganesh museum on the premises is also free or nominal. Stalls outside are paid separately.",
  },
  {
    q: "When is the best time to go?",
    a: "Late afternoon into evening, when families fill the path and the stalls open. Mornings are quieter for the shrine. Combine with Parvati Hill next door.",
  },
  {
    q: "Is the lake still there?",
    a: "No. The ornamental tank silted up and was turned into lawns in the 1960s. You walk the old shoreline. The shrine still sits on the island mound in the middle.",
  },
  {
    q: "What can I combine it with?",
    a: "Parvati Hill Temple is adjacent — 103 steps and a city view. Okayama Friendship Garden is a short drive down Sinhagad Road if you want a second garden the same day.",
  },
];
