/**
 * Editorial content for the Vetal Tekdi detail page.
 *
 * `HILL_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/vetal/hill-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type HillFeature = {
  id:
    | "summit-shrine"
    | "city-panorama"
    | "quarry-lake"
    | "the-trails"
    | "scrub-forest"
    | "ridge-walk";
  title: string;
  marathi: string;
  icon: string;
  blurb: string;
  detail: string;
};

export const HILL_FEATURES: HillFeature[] = [
  {
    id: "summit-shrine",
    title: "The Vetal shrine",
    marathi: "वेताळ मंदिर · Vetal mandir",
    icon: "landmark",
    blurb: "A small stone shrine to Vetal, the hill's guardian deity, at the very top.",
    detail:
      "Perched at roughly 800 m, the summit shrine is a modest stone platform with a simple shikhara and a saffron flag that flies year-round. Vetal is a folk guardian deity revered across the Deccan; the name 'Vetal Tekdi' comes from this very shrine. Morning walkers pause here for a breath and a glance at the city spread out below — the shrine is the destination, but the view is the reward.",
  },
  {
    id: "city-panorama",
    title: "The city panorama",
    marathi: "शहर दृश्य · Shahar drushya",
    icon: "sunrise",
    blurb: "A 360° sweep over Pune — the Mutha valley, the Sahyadris, and the glowing skyline at dusk.",
    detail:
      "From the south shoulder of the summit you get the classic Vetal Tekdi view: the old city and the university campus in the foreground, the high-rises of Hinjawadi and Baner on the horizon, and on clear days the jagged wall of the Sahyadris framing it all. At dawn the city wakes in layers of mist; at sunset the grid flickers on, and the hill becomes Pune's favourite balcony.",
  },
  {
    id: "quarry-lake",
    title: "The quarry pond",
    marathi: "खणीज तलाव · Khaanij talav",
    icon: "droplets",
    blurb: "An abandoned stone quarry that fills with rainwater — a magnet for birds and dragonflies.",
    detail:
      "Decades of basalt quarrying left a deep, amphitheatre-shaped pit on the eastern flank. Come the monsoon it turns into a seasonal lake, ringed by scrub and alive with white-throated kingfishers, red-wattled lapwings and swarms of dragonflies. By summer the water recedes, leaving wet clay that still draws wildlife. It is a quiet corner most visitors miss — take the branch trail from the main path.",
  },
  {
    id: "the-trails",
    title: "The trails",
    marathi: "पायवाटा · Payavata",
    icon: "route",
    blurb: "A network of paths from four trailheads — gentle switchbacks or steep rocky climbs.",
    detail:
      "Vetal Tekdi isn't a single trail but a web. The most-used route starts near Paud Road (Kothrud) and winds up in wide, graded switchbacks — 30 minutes at a steady pace. The Aundh and Pashan approaches are shorter but steeper, threading through boulder fields. The ARAI hill side connects to the adjoining ridge for those wanting a longer ridge walk. All are unmarked but well-trodden; a GPX track or a local companion helps on a first visit.",
  },
  {
    id: "scrub-forest",
    title: "Scrub forest & birds",
    marathi: "कुरण व पक्षी · Kuraṇ v pakshi",
    icon: "bird",
    blurb: "Dry deciduous scrub on basalt — home to over a hundred recorded bird species.",
    detail:
      "The hill's vegetation is classic Deccan thorn-scrub: stunted teak, acacia, ziziphus and euphorbia on thin soil over basalt. In the monsoon it flushes an improbable green. Birders have logged 100+ species here — Indian grey hornbill, white-bellied drongo, ashy prinia, tickell's blue flycatcher, and the ever-present peafowl. Raptors (shikra, black-winged kite) quarter the slopes. The saddle between the main summit and the eastern ridge is especially productive in the early morning.",
  },
  {
    id: "ridge-walk",
    title: "The ridge walk",
    marathi: "कडा · Kaḍā",
    icon: "mountain",
    blurb: "A narrow basalt spine connecting Vetal to ARAI hill and beyond — exposed, windy, spectacular.",
    detail:
      "Past the main summit the hill narrows to a rocky crest that runs northeast toward the ARAI campus and the Chaturshringi hills. It is an exposed walk — wind off the Mutha valley, wide skies, the city falling away on both sides. In the monsoon clouds sweep along the ridge at eye level; in winter the air is crisp and the Sahyadris are sharp on the horizon. This is the walk for those who want the city to feel small.",
  },
];

export const HILL_STATS: { label: string; value: string; note: string }[] = [
  { label: "Height", value: "~800 m", note: "The highest point within Pune city" },
  { label: "Trailheads", value: "4+", note: "Kothrud · Aundh · Pashan · ARAI hill" },
  { label: "Best light", value: "6–8 AM", note: "Sunrise over the city skyline" },
  { label: "Cost", value: "Free", note: "Open ground, always" },
];

export const HILL_STORY: { heading: string; body: string }[] = [
  {
    heading: "Pune's own hill",
    body:
      "Vetal Tekdi is not a park you visit — it is a hill you belong to. Morning walkers, runners, birders, students from the campus at its foot, families carrying breakfast to the shrine, photographers chasing the first light — they all share the same network of paths. The hill has no gates, no tickets, no closing hour. It is the commons at the heart of the city, and Pune defends it: whenever a road, a tunnel or a construction plan threatens the tekdi, citizen groups (most famously the Vetal Tekdi Bachao Kruti Samiti) organise, litigate and win. The hill stays because people show up for it.",
  },
  {
    heading: "Rock, scrub and bird song",
    body:
      "Geologically the hill is Deccan basalt — the same lava flows that built the Sahyadris, here folded into a blunt dome. The soil is thin, the rock close to the surface, and the vegetation is dry deciduous scrub: stunted teak, flame of the forest, ber, and thickets of carissa. In June the first rains turn it electric green; by October it is a meadow. Over a hundred bird species have been recorded across the tekdi cluster — hornbills in the fruiting figs, drongos mobbing a shikra, peafowl dust-bathing on the trail. It is a functioning urban ecosystem, not a garden, and that is exactly why it matters.",
  },
  {
    heading: "The god at the top",
    body:
      "Vetal (or Vetala) is a guardian spirit of the Deccan, neither fully god nor ghost — a presence that watches boundaries and crossings. The shrine at the summit is small: a stone platform, a saffron flag, a few oil lamps at dusk. The name 'Vetal Tekdi' has eclipsed the older 'Hanuman Tekdi' (the hill is also called Hanuman Tekdi in some records, for a Hanuman idol lower down). The quarry pond on the eastern flank is a scar from the years when basalt was cut for Pune's roads — now reclaimed by rain and life. The hill carries both stories: the ancient one at the top, the industrial one in the hollow, and the daily one on the paths between them.",
  },
];

export const HILL_ETIQUETTE: string[] = [
  "Stick to the main trails — the scrub is fragile and the basalt slopes erode fast once the surface is broken.",
  "Carry your water and waste back down. There are no bins on the hill.",
  "If you climb for sunrise, go with company and carry a headtorch. The trails are uneven in the dark.",
  "No loud music or speakers — it is a birding habitat and a place of quiet for many.",
  "Dogs off-leash disturb ground-nesting birds and the occasional monitor lizard; keep them close.",
  "Monsoon rocks get slick, especially on the steeper Aundh and Pashan approaches. Watch for snakes after rain.",
];

export const HILL_FAQS: { q: string; a: string }[] = [
  {
    q: "Which trailhead should I start from?",
    a:
      "The Kothrud side (near MIT / Paud Road) is the most popular — wide, graded switchbacks, 30–40 minutes to the top. The Aundh and Pashan trailheads are shorter but steeper with rocky steps. The ARAI hill approach connects to the ridge walk for a longer outing. For a first visit, start from Kothrud; the path is obvious and well-trodden.",
  },
  {
    q: "Is it safe before sunrise?",
    a:
      "The hill is popular with morning walkers from 5:30 AM onward. Go in company, stick to the main Kothrud trail, and carry a headtorch. Occasional snakes (rat snake, checkered keelback) are seen after rain — give them space and they move on. The summit area is open and well-trafficked by 6 AM.",
  },
  {
    q: "How hard is the climb?",
    a:
      "Easy to moderate. From the Kothrud trailhead it is 30–45 minutes of steady uphill on wide switchbacks. The Aundh and Pashan approaches gain the same height in half the horizontal distance — steeper, rockier, more scrambling. The ridge walk beyond the summit is level but exposed to wind and sun. Most people of average fitness can reach the shrine without trouble.",
  },
  {
    q: "What is there at the top?",
    a:
      "The small Vetal shrine, a saffron flag, a stone platform, and a 360° panorama. To the south and west: the Pune skyline, the Mutha river, the university campus, the high-rises of Hinjawadi. To the north and east: the Sahyadri wall, the ARAI campus, and on a clear day the forts of Sinhagad and Torna on the horizon. There is no shop, no water, no shelter — just the view and the wind.",
  },
  {
    q: "Is the quarry pond always full?",
    a:
      "It swells in and just after the monsoon (July–October) and shrinks through the dry months, sometimes to a damp clay floor by May. The water draws birds either way — kingfishers, lapwings, sandpipers on the mud. It is deep in places with sheer basalt walls; do not swim or wade in it.",
  },
];