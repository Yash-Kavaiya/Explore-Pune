/**
 * Editorial content for the Sinhagad Fort detail page.
 *
 * `SINHAGAD_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/sinhagad/sinhagad-world.ts) — keep the ids in sync.
 */

export type SinhagadFeature = {
  id:
    | "kalyan-darwaja"
    | "tanaji-memorial"
    | "trek-trail"
    | "lookout"
    | "hilltop-stalls"
    | "pune-darwaja"
    | "kadelot-point";
  title: string;
  marathi: string;
  icon: string;
  blurb: string;
  detail: string;
};

export const SINHAGAD_FEATURES: SinhagadFeature[] = [
  {
    id: "kalyan-darwaja",
    title: "Kalyan Darwaja",
    marathi: "कल्याण दरवाजा · Western gate",
    icon: "castle",
    blurb: "The steeper western approach gate, facing the Kalyan side of the range.",
    detail:
      "Kalyan Darwaja is the harder climb — a zigzag of stone steps cut into the cliff face that rewards anyone who takes it with the sense of arriving at a real hill fort. The gatehouse still shows bastion flanks and the narrow throat designed so a few men could hold many. Most trekkers use the other side; this one is quieter and steeper.",
  },
  {
    id: "tanaji-memorial",
    title: "Tanaji’s memorial",
    marathi: "तानाजी स्मारक · The Lion’s memorial",
    icon: "sparkles",
    blurb: "Where Tanaji Malusare’s sacrifice in 1670 is remembered on the cliff.",
    detail:
      "In February 1670 Tanaji Malusare scaled the fort with a handful of men to retake it from the Mughals. He fell in the fighting; Shivaji is said to have renamed Kondhana as Sinhagad — the Lion’s Fort — in his honour. A small memorial and a sheer rock face mark the story. Stand here at dawn and the legend is not abstract: the drop is real, and the fort feels earned.",
  },
  {
    id: "trek-trail",
    title: "The trek trail",
    marathi: "चढाई · Chadhai · The climb",
    icon: "route",
    blurb: "The steep stone path from the base village up to the fort wall.",
    detail:
      "From the base near Thoptewadi the trail rises in steps and loose rock for about an hour of honest climbing. Monsoon makes it a green corridor; summer makes it a test of water and will. Shared taxis go higher for those who want the top without the full ascent — but the trail is still the purest way to arrive.",
  },
  {
    id: "lookout",
    title: "The panoramic lookout",
    marathi: "दृश्य · Drishya · Reservoir views",
    icon: "mountain",
    blurb: "A 360° sweep of Khadakwasla, Panshet and the Sahyadri ridges.",
    detail:
      "On a clear day the two reservoirs flash silver below, Pune sits as a haze to the northeast, and the Deccan plateau runs out under stacked hills. Sunset is the busiest hour; monsoon clouds turn the same view into a sea of white. There is no single ‘best’ rock — walk the circuit wall and the frame keeps changing.",
  },
  {
    id: "hilltop-stalls",
    title: "Hilltop stalls",
    marathi: "कांदा भजी · Kanda bhaji & curd",
    icon: "house",
    blurb: "Hot onion bhaji, pithla-bhakri and thick buttermilk at the top.",
    detail:
      "The fort’s unofficial canteen is a string of family-run stalls that have fed generations of climbers. Kanda bhaji (onion fritters) and thick curd are the classics; pithla-bhakri and chai fill the gaps. Sit on a stone bench with the wind in your face — this is half the reason people come back every weekend.",
  },
  {
    id: "pune-darwaja",
    title: "Pune Darwaja",
    marathi: "पुणे दरवाजा · City-side gate",
    icon: "landmark",
    blurb: "The main approach gate on the Pune side — busier, gentler, more used.",
    detail:
      "Most visitors enter through Pune Darwaja, the eastern gate above the motorable stretch and the popular trek route. It is wider and better maintained than Kalyan Darwaja, with the same defensive logic: a bent entrance, high walls, and a view that makes you understand why this ridge was worth dying for.",
  },
  {
    id: "kadelot-point",
    title: "Kadelot Point",
    marathi: "कडेलोट पॉइंट · The sheer drop",
    icon: "shield",
    blurb: "A wind-blasted rock prow past the southern wall, with a vertical fall and a grim legend.",
    detail:
      "Beyond the southern ramparts the rock narrows into a bare prow above a near-vertical drop. Local tradition says the fort’s keepers rolled condemned prisoners off this edge — kadelot, the cliff-roll — and whether or not every tale is true, the drop itself needs no exaggeration. There are no railings, the wind shoves at your shoulders, and the Sahyadri falls away in one long slide of scree toward the Panshet side. Come for the emptiness and the hard, clear winter light; stay well back from the edge.",
  },
];

export const SINHAGAD_STATS: { label: string; value: string; note: string }[] = [
  { label: "Elevation", value: "~1,312 m", note: "Sahyadri ridge above Pune" },
  { label: "The battle", value: "1670", note: "Tanaji Malusare retook Kondhana" },
  { label: "Old name", value: "Kondhana", note: "Renamed Sinhagad — Lion’s Fort" },
  { label: "Typical visit", value: "Half day", note: "Trek up, stalls, circuit, drive down" },
];

export const SINHAGAD_STORY: { heading: string; body: string }[] = [
  {
    heading: "A fort that became a name",
    body: "Kondhana was an old Deccan stronghold long before the Marathas made it famous. In 1670 Tanaji Malusare led a night assault up the cliffs; he did not survive the victory. Shivaji’s reported words — that he had gained a fort and lost a lion — fixed the fort’s new name, Sinhagad, in the region’s memory. The stone walls you walk today are later repairs; the story is the real monument.",
  },
  {
    heading: "Pune’s weekend mountain",
    body: "For the city below, Sinhagad is not only history. It is the default half-day: leave early, climb or drive, eat bhaji in the wind, watch the reservoirs, and return before traffic. In monsoon the ridge is a cloud walk; in winter the air is hard and clear. Either way the fort still feels like a place you have to earn — even if you took a taxi most of the way.",
  },
  {
    heading: "How to read the top",
    body: "Once inside the walls, walk the circuit rather than sitting at the first stall. Pass Pune Darwaja and Kalyan Darwaja, find the Tanaji memorial on the cliff side, feel the drop at Kadelot Point, then loop the lookouts until the reservoirs show. Save the food for the end: hot oil and cold curd taste better when your legs already know the climb.",
  },
];

export const SINHAGAD_ETIQUETTE: string[] = [
  "Carry water and wear grippy shoes — the trail is steep and can be slippery after rain.",
  "Stay on marked paths near cliff edges; the memorial side and Kadelot Point have serious, unrailed drops.",
  "Pack out your litter; the fort gets heavy weekend traffic and limited bins.",
  "Monsoon fog can close the road and trail sections — check weather before you leave.",
  "Respect the memorial and temple spaces; keep music low near the cliff.",
];

export const SINHAGAD_FAQS: { q: string; a: string }[] = [
  {
    q: "Do I have to trek the whole way?",
    a: "No. You can drive most of the way up (parking charges apply) and walk a short final stretch, or trek from the base village for about an hour. Shared jeeps/taxis also run from the foot on busy days.",
  },
  {
    q: "Is Sinhagad good in the monsoon?",
    a: "Yes — it is one of the best monsoon views near Pune — but rocks and roads get slippery, and fog can cut visibility. Start early, wear proper shoes, and skip the trip if thunderstorms are forecast.",
  },
  {
    q: "What should I not miss at the top?",
    a: "The Tanaji memorial on the cliff side, the sheer prow of Kadelot Point on the southern rim, the circuit of lookouts over Khadakwasla and Panshet, both main gates (Pune and Kalyan Darwaja), and at least one plate of kanda bhaji with curd.",
  },
  {
    q: "How long does a visit take?",
    a: "A relaxed half day: 1–1.5 hours for the climb if you trek, 45–90 minutes on top for the walls and food, plus travel time (~1 hour each way from central Pune depending on traffic).",
  },
  {
    q: "What can I pair with Sinhagad?",
    a: "Khadakwasla Dam sits below the same ridge and makes a natural double stop — fort first while you have energy, then the dam promenade and snacks on the way back.",
  },
];
