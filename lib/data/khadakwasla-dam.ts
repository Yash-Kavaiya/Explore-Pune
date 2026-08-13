/**
 * Editorial content for the Khadakwasla Dam detail page.
 *
 * `DAM_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/dam/dam-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type DamFeature = {
  id: "dam-wall" | "reservoir" | "sluice-gates" | "promenade" | "sinhagad-hill";
  title: string;
  /** Marathi term for the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const DAM_FEATURES: DamFeature[] = [
  {
    id: "dam-wall",
    title: "The dam wall",
    marathi: "धरण भिंत · Dharaṇ Bhīnt",
    icon: "landmark",
    blurb: "A masonry gravity wall nearly two kilometres long, holding the Mutha across the valley.",
    detail:
      "Khadakwasla is a masonry gravity dam on the Mutha, finished in 1879 and rebuilt after the 1961 Panshet floods. The wall is about 1.6–1.9 km long and a little over 30 metres high. You do not visit a tower here. You walk the crest: stone on one side, the lake on the other, Sinhagad on the skyline. That long, level walk is the whole character of the place.",
  },
  {
    id: "reservoir",
    title: "Khadakwasla Lake",
    marathi: "खडकवासला तलाव · Khaḍakvāslā Talāv",
    icon: "droplets",
    blurb: "Twenty-two kilometres of backwater — Pune’s drinking water, and the view everyone comes for.",
    detail:
      "The Mutha is held here as Khadakwasla Lake. The backwaters run nearly 22 km, 250 to 1,000 metres across, up to 36 metres deep. Panshet, Varasgaon and Temghar feed it; the city drinks from it. In the dry months the shore recedes and the wall looks taller. After the monsoon the lake comes up to the crest and the water goes gold at sunset. That is when people stay.",
  },
  {
    id: "sluice-gates",
    title: "The radial sluices",
    marathi: "जलद्वार · Jaladvār",
    icon: "door-open",
    blurb: "Eleven radial gates in the wall — the valves of Pune’s water and the Mutha’s flood.",
    detail:
      "The dam has eleven radial-type sluice gates and six irrigation outlets into two canals. When the lake is high the gates lift and a white sheet drops on the downstream face. When they are shut you see only the steel curves set in the masonry. They are the working heart of the wall: not decoration, the reason the city has water and the river has a schedule.",
  },
  {
    id: "promenade",
    title: "The chowpatty promenade",
    marathi: "चौपाटी · Chaupāṭī",
    icon: "route",
    blurb: "Pune’s lakeside evening — corn, bhaji, chai, and a breeze off the water.",
    detail:
      "Sinhagad Road runs the downstream side of the wall and has become the city’s unofficial chowpatty. Families and couples fill the promenade at dusk. Stalls sell roasted corn, kanda bhaji, bhel and cutting chai. There is no ticket and no closing time that anyone enforces. You come for the air and the light on the lake, and you leave smelling of smoke and fried batter.",
  },
  {
    id: "sinhagad-hill",
    title: "Sinhagad on the skyline",
    marathi: "सिंहगड · Siṃhagaḍ",
    icon: "mountain",
    blurb: "The Lion Fort sits on the ridge behind the lake — the reason every photograph has a silhouette.",
    detail:
      "A few kilometres south, Sinhagad crowns the Sahyadri spur that closes the valley. From the promenade the fort is a dark ridgeline, not a climb. Pair the two in one afternoon: the wall and the water first, then the hill. The monsoon makes both of them — full lake, green slopes — and that pairing is why Khadakwasla is never just a dam visit.",
  },
];

export const DAM_STATS: { label: string; value: string; note: string }[] = [
  { label: "On the", value: "Mutha", note: "Holds Khadakwasla Lake, Pune’s main supply" },
  { label: "The wall", value: "1.6 km", note: "Masonry gravity dam, ~31 m high" },
  { label: "Gates", value: "11 radial", note: "Plus six irrigation outlets into two canals" },
  { label: "Best light", value: "Sunset", note: "Monsoon and just after, when the lake is full" },
];

export const DAM_STORY: { heading: string; body: string }[] = [
  {
    heading: "The lake that waters Pune",
    body:
      "Khadakwasla sits on the Mutha about twenty kilometres southwest of the city. The river is born of the Ambi and the Mose, which Panshet and Varasgaon already hold; Temghar feeds in from the north. What you see from the wall is the last and most public of those lakes — a 22-kilometre backwater that still supplies much of Pune’s drinking water. The dam of 1879 was smashed in the 1961 Panshet disaster and raised again. The city has been drinking from this valley ever since.",
  },
  {
    heading: "A wall you walk, not a monument you enter",
    body:
      "The masonry crest is a road and a promenade. Eleven radial sluices sit in the face. On one side the lake; on the other a strip of stalls and the Mutha continuing toward the city. There is no palace and no sanctum. The visit is the walk: wind, water, fried corn, and the dark outline of Sinhagad on the ridge. Evenings are when it fills. The monsoon is when the reservoir comes up to the wall and the whole composition — lake, crest, hill — finally matches the photographs.",
  },
  {
    heading: "Chowpatty with a fort behind it",
    body:
      "People call the lakeside Pune’s chowpatty because it behaves like one: no ticket, snack smoke, couples on the parapet, children on the steps. The difference is the Sahyadri backdrop. Stay for sunset if you can. Then, if there is light left, drive up to Sinhagad — the same ridge you have been looking at all evening. That is the classic half-day out of the city.",
  },
];

export const DAM_ETIQUETTE: string[] = [
  "The crest is a working dam — stay on the public promenade; do not climb the sluice structure or the downstream face.",
  "The lake is drinking water. Do not swim, wash vehicles, or throw plastic from the wall.",
  "Evenings are crowded; keep to one side of the path so people can pass.",
  "Monsoon spray and wet stone are slippery. Wear shoes with grip if the gates are open.",
  "Drones over the dam need prior permission. The wall is critical infrastructure.",
  "Carry cash for the stalls; many still do not take cards after dark.",
];

export const DAM_FAQS: { q: string; a: string }[] = [
  {
    q: "What river is Khadakwasla Dam on?",
    a: "The Mutha. The dam holds Khadakwasla Lake, which supplies much of Pune’s drinking water. Panshet, Varasgaon and Temghar feed the same system upstream.",
  },
  {
    q: "How long is the dam wall?",
    a: "About 1.6 to 1.9 kilometres, a little over 30 metres high. It is a masonry gravity dam with eleven radial sluice gates and six irrigation outlets.",
  },
  {
    q: "Is there an entry fee?",
    a: "No. The promenade is free and open. Parking and snack stalls are paid separately. It is liveliest from late afternoon into the evening.",
  },
  {
    q: "When is the best time to go?",
    a: "Sunset, especially in and just after the monsoon when the reservoir is full. Winter evenings are clear and less humid. Pair it with Sinhagad Fort, which sits on the ridge behind the lake.",
  },
  {
    q: "Can I combine it with Sinhagad?",
    a: "Yes — that is the usual half-day. The fort is a few kilometres south of the dam, up Sinhagad Road. Do the lake first, then the climb, or reverse it if you want sunrise on the hill.",
  },
];
