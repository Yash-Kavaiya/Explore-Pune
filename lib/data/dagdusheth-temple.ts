/**
 * Editorial content for the Dagdusheth Halwai Ganapati Temple detail page.
 *
 * `TEMPLE_FEATURES[].id` doubles as the hotspot id in the 3D scene
 * (components/places/temple/temple-world.ts) — the HTML feature list and the
 * WebGL markers are two views of this one list, so keep the ids in sync.
 */

export type TempleFeature = {
  id:
    | "mahadwar"
    | "ganesh-idol"
    | "sabha-mandap"
    | "deepmalas"
    | "courtyard"
    | "ganeshotsav";
  title: string;
  /** Marathi term for the element, transliterated. */
  marathi: string;
  /** lucide-react icon key, resolved via the icon registry. */
  icon: string;
  blurb: string;
  detail: string;
};

export const TEMPLE_FEATURES: TempleFeature[] = [
  {
    id: "mahadwar",
    title: "The Mahadwar",
    marathi: "महाद्वार · Mahādvār",
    icon: "castle",
    blurb: "The ornate main gateway, crowned with the temple's kalash and flag.",
    detail:
      "The mahadwar marks the threshold between the bustling lanes of Budhwar Peth and the sacred precinct. Its lintel carries a silver repoussé panel of Ganesha, and the wooden doors are studded with brass bossing — a nod to the anti-elephant spikes of fort gates, here transformed into ornament. Above it rises the temple's golden kalash, visible from the surrounding streets as a beacon.",
  },
  {
    id: "ganesh-idol",
    title: "The Gold-Adorned Idol",
    marathi: "सोनेचा गणपती · Sonēca Gaṇapatī",
    icon: "gem",
    blurb: "The swayambhu idol draped in kilos of gold ornaments and fresh flowers daily.",
    detail:
      "The black-stone swayambhu (self-manifested) idol of Ganesha sits in the garbhagriha under a silver-plated canopy. What makes it extraordinary is the daily alankar: kilos of gold jewellery — the mukut, haar, kangan, kamarbandh and the iconic golden modak in the trunk — donated by generations of devotees. Fresh flower garlands are offered three times a day; on Angarki Chaturthi and during Ganeshotsav the adornment changes hourly.",
  },
  {
    id: "sabha-mandap",
    title: "The Sabha Mandap",
    marathi: "सभा मंडप · Sabhā Maṇḍap",
    icon: "landmark",
    blurb: "The pillared assembly hall where thousands gather for aarti and darshan.",
    detail:
      "The mandap spans the full width of the temple front, its teak columns carved with floral motifs and capped with brass lotus finials. The ceiling holds dozens of brass deepams (oil lamps) that are lit for the evening aarti, turning the space into a pool of golden light. The floor is laid with white marble inset with black stone bands — cool underfoot even in May — and the side walls carry framed silver plaques recording major donations and royal visits from the Peshwa era to the present.",
  },
  {
    id: "deepmalas",
    title: "The Deepmalas",
    marathi: "दीपमाला · Dīpamālā",
    icon: "lamp",
    blurb: "Towering lamp pillars that blaze during festivals and every evening aarti.",
    detail:
      "Two stone deepmalas stand in the courtyard, each rising four metres with tiered niches for oil lamps. During Ganeshotsav and on Sankashti Chaturthi every niche holds a flame, and the pillars become pillars of fire. The deepmalas are an older Deccan temple form — seen at Tuljapur and Jejuri — and their presence here links the temple to the wider bhakti geography of Maharashtra.",
  },
  {
    id: "courtyard",
    title: "The Courtyard & Queue",
    marathi: "आंगण · Āṅgaṇa",
    icon: "trees",
    blurb: "The marble-paved forecourt where the queue forms under fabric canopies.",
    detail:
      "The courtyard is the social space of the temple: families wait here, vendors sell modak and coconuts, and the air carries incense, marigold and the murmur of the Ganapati Atharvashirsha. Retractable fabric canopies run on steel wires to shade the queue in summer; in the monsoon the same frames carry waterproof covers. At the far end a small shrine to Mushak (the mouse vahana) receives its own share of laddu.",
  },
  {
    id: "ganeshotsav",
    title: "The Ganeshotsav Transformation",
    marathi: "गणेशोत्सव · Gaṇeśōtsav",
    icon: "sparkles",
    blurb: "Ten days when the temple becomes the axis of Pune's biggest public festival.",
    detail:
      "During Ganeshotsav the temple precinct expands into the streets: temporary mandaps rise in every lane, sound systems relay the aarti to crowds spilling onto Laxmi Road, and the idol's alankar changes every few hours — each sponsored by a different family or mandal. The immersion procession on Anant Chaturthi starts here, with the temple's own palanquin leading thousands of devotees through the old city to the Mutha river. It is the week Pune re-centres itself around this shrine.",
  },
];

export const TEMPLE_STATS: { label: string; value: string; note: string }[] = [
  { label: "Founded", value: "1893", note: "By Dagdusheth Halwai & wife Lakshmibai" },
  { label: "Deity", value: "Swayambhu Ganesha", note: "Black stone, gold-alankar daily" },
  { label: "Trust assets", value: "₹300+ cr", note: "Among India's richest temple trusts" },
  { label: "Daily footfall", value: "25,000+", note: "Lakhs during Ganeshotsav" },
];

export const TEMPLE_STORY: { heading: string; body: string }[] = [
  {
    heading: "A sweet-maker's vow",
    body:
      "Dagdusheth Gadve was a halwai — a maker of sweets — who lost his teenage son to plague in the late 1880s. Grief-stricken, he and his wife Lakshmibai prayed for a child and vowed that if their wish was granted they would build a temple to Ganesha. When a son was born, they kept their word: in 1893 they bought a modest plot in Budhwar Peth and installed a swayambhu idol they had found. The temple grew with the city; every major donation, every kilo of gold, every square foot of marble came from devotees who saw their own prayers answered here.",
  },
  {
    heading: "The gold that never sleeps",
    body:
      "The temple's gold ornaments are not museum pieces — they are worn by the deity every single day. The trust employs a team of goldsmiths who maintain, polish and reset the jewellery; the mukut alone weighs several kilograms. Security is layered: the garbhagriha has its own vault, the daily alankar is conducted under CCTV, and the immersion palanquin is escorted by a dedicated police detail. Yet the atmosphere is open, not fortress-like — the gold is offered by devotees, and the trust publishes its accounts annually.",
  },
  {
    heading: "The heartbeat of Ganeshotsav",
    body:
      "Lokmanya Tilak transformed Ganeshotsav from a household observance into a public festival in 1893, the same year the temple was founded. Dagdusheth became the epicentre: the first public Ganesh idol in Pune was installed here, and the immersion procession still follows the route Tilak walked. For ten days the temple does not close — aarti runs every two hours, the queue stretches for kilometres, and the lanes around Budhwar Peth become a pedestrian carnival of light, music and modak. If you visit Pune once, make it this week.",
  },
];

export const TEMPLE_ETIQUETTE: string[] = [
  "Footwear must be left at the designated stands before the mahadwar — tokens are free.",
  "Dress modestly: shoulders and knees covered for all visitors.",
  "Photography is prohibited inside the garbhagriha; permitted in the mandap and courtyard without flash.",
  "The queue moves continuously — do not stop for selfies at the idol; step aside for others.",
  "Offerings (coconut, modak, flowers) can be bought from authorised counters only.",
  "During Ganeshotsav expect waits of 2–4 hours; early morning (5–6 AM) is quietest.",
];

export const TEMPLE_FAQS: { q: string; a: string }[] = [
  {
    q: "Is the idol really made of gold?",
    a:
      "The idol itself is black stone (swayambhu). What you see as gold is the daily alankar — kilograms of gold ornaments (mukut, haar, kangan, kamarbandh, modak) that adorn the stone idol. The ornaments are removed and secured after the last aarti each night.",
  },
  {
    q: "Can non-Hindus enter the temple?",
    a:
      "Yes. The temple is open to all visitors regardless of faith. The only requirements are modest dress, removing footwear, and following the queue discipline. Non-Hindu visitors are welcome to sit in the mandap and observe the aarti.",
  },
  {
    q: "What is the best time to visit for a peaceful darshan?",
    a:
      "Weekday early mornings (5:30–6:30 AM) and late nights (after 9:30 PM) are quietest. Weekends, Sankashti Chaturthi, and the entire Ganeshotsav period see heavy crowds. If you want the full festive atmosphere, Ganeshotsav is unmatched — but budget half a day.",
  },
  {
    q: "How do I reach the temple from Shaniwar Wada?",
    a:
      "It is a 10-minute walk (800 m) through the old city lanes: exit Shaniwar Wada onto Bajirao Road, turn right at the Phadke Haud chowk, and follow the signs for Dagdusheth Mandir. Autos and e-rickshaws also ply the route.",
  },
  {
    q: "Does the temple trust run any social initiatives?",
    a:
      "Yes. The Shreemant Dagdusheth Halwai Sarvajanik Ganapati Trust runs hospitals, schools, a blood bank, an old-age home, and disaster relief operations across Maharashtra. The trust's annual report is publicly available and details every rupee of donation income and expenditure.",
  },
];