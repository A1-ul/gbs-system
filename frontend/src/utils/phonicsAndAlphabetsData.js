/**
 * GBS 42 Jolly Phonics Sounds & Global Country/Language Alphabets + Letter-Formation Guide
 *
 * Covers:
 * 1. All 42 Official Jolly Phonics Sounds (Groups 1–7) with phonetic sound cues, IPA,
 *    actions, example words, audio pronunciation prompts, and step-by-step letter writing strokes.
 * 2. Complete Country-and-Language Alphabets prepared for EVERY country on the GBS system
 *    (Ghana, Nigeria, Kenya, South Africa, UK, US, Canada, France, Germany, Spain, Brazil,
 *    UAE, Saudi Arabia, India, China, Japan, and Global/International) with letter sounds,
 *    example words, writing direction (LTR/RTL), and how each letter is written.
 */

export const JOLLY_PHONICS_GROUPS = [
  { group: 1, title: "Group 1", summary: "s, a, t, i, p, n", color: "#38bdf8" },
  { group: 2, title: "Group 2", summary: "ck, e, h, r, m, d", color: "#34d399" },
  { group: 3, title: "Group 3", summary: "g, o, u, l, f, b", color: "#fbbf24" },
  { group: 4, title: "Group 4", summary: "ai, j, oa, ie, ee, or", color: "#c084fc" },
  { group: 5, title: "Group 5", summary: "z, w, ng, v, oo, OO", color: "#f472b6" },
  { group: 6, title: "Group 6", summary: "y, x, ch, sh, th, TH", color: "#fb923c" },
  { group: 7, title: "Group 7", summary: "qu, ou, oi, ue, er, ar", color: "#4ade80" }
];

export const JOLLY_PHONICS_42_SOUNDS = [
  // GROUP 1 (1–6)
  { id: 1, phonemeKey: "s", group: 1, grapheme: "s", upper: "S", ipa: "/s/", soundCue: "ssssss (like a hissing snake)", phonemeSpeak: "ssssss", speakText: "ssssss, as in snake, sun, sat", action: "Weave hand in an S shape like a snake and say ssssss.", examples: ["sun", "sat", "snake"], howToWrite: "Start near the top right, curve left over the top, slant down right across the middle, then curve back left along the bottom line." },
  { id: 2, phonemeKey: "a", group: 1, grapheme: "a", upper: "A", ipa: "/æ/", soundCue: "ah-ah-ah (short a, ants on arm)", phonemeSpeak: "ah", speakText: "ah, ah, ah, as in ant, apple, cat", action: "Wiggle fingers up your arm as if ants are crawling and say ah, ah, ah.", examples: ["ant", "apple", "cat"], howToWrite: "Lowercase a: Curve left all the way around into a round circle, go up to join, then straight down with a short flick. Uppercase A: Slant down left, slant down right from top, then cross the middle." },
  { id: 3, phonemeKey: "t", group: 1, grapheme: "t", upper: "T", ipa: "/t/", soundCue: "tuh-tuh-tuh (watching tennis)", phonemeSpeak: "tuh", speakText: "tuh, tuh, tuh, as in tap, tennis, top", action: "Turn head side to side as if watching tennis and say tuh, tuh, tuh.", examples: ["tap", "tennis", "tin"], howToWrite: "Start tall above the middle line, pull straight down to the baseline with a small curl right, then lift pen and draw a short bar across the middle." },
  { id: 4, phonemeKey: "i", group: 1, grapheme: "i", upper: "I", ipa: "/ɪ/", soundCue: "ih-ih-ih (inky mouse whiskers)", phonemeSpeak: "ih", speakText: "ih, ih, ih, as in ink, igloo, pin", action: "Pretend to be a mouse wiggling whiskers and squeak ih, ih, ih.", examples: ["ink", "igloo", "pin"], howToWrite: "Start at the middle line, pull straight down to the bottom line with a tiny flick, lift pen and place one neat dot above the line." },
  { id: 5, phonemeKey: "p", group: 1, grapheme: "p", upper: "P", ipa: "/p/", soundCue: "puh-puh-puh (puffing out a candle)", phonemeSpeak: "puh", speakText: "puh, puh, puh, as in pan, pig, pat", action: "Hold up one finger like a candle and puff gently saying puh, puh, puh.", examples: ["pan", "pig", "pat"], howToWrite: "Start at the middle line, go straight down below the baseline into the descender space, trace back up and curve clockwise around to form a round belly sitting on the baseline." },
  { id: 6, phonemeKey: "n", group: 1, grapheme: "n", upper: "N", ipa: "/n/", soundCue: "nnnnnn (airplane engine)", phonemeSpeak: "nnnnnn", speakText: "nnnnnn, as in net, nap, nest", action: "Hold arms out like airplane wings and make a steady nnnnn sound.", examples: ["net", "nap", "nest"], howToWrite: "Start at the middle line, go straight down to the baseline, bounce back up the same line, arch over to the right, and come straight down." },

  // GROUP 2 (7–12)
  { id: 7, phonemeKey: "ck", group: 2, grapheme: "ck", upper: "C / K", ipa: "/k/", soundCue: "kuh-kuh-kuh (clicking castanets)", phonemeSpeak: "kuh", speakText: "kuh, kuh, kuh, as in cat, kite, duck", action: "Raise hands and snap fingers like castanets saying kuh, kuh, kuh.", examples: ["cat", "kite", "duck"], howToWrite: "c: Start at top right of the middle line and curve left like an open moon. k: Draw a tall line down from top to bottom, lift to middle, slant in to touch the stem, then kick slant down right." },
  { id: 8, phonemeKey: "e", group: 2, grapheme: "e", upper: "E", ipa: "/e/", soundCue: "eh-eh-eh (cracking an egg)", phonemeSpeak: "eh", speakText: "eh, eh, eh, as in egg, hen, ten", action: "Pretend to tap and crack an egg on the side of a pan saying eh, eh, eh.", examples: ["egg", "hen", "ten"], howToWrite: "Start slightly below the middle line, push straight across to the right, then loop up and counter-clockwise all the way around down to the baseline." },
  { id: 9, phonemeKey: "h", group: 2, grapheme: "h", upper: "H", ipa: "/h/", soundCue: "hhh (panting after running)", phonemeSpeak: "huh", speakText: "huh, huh, huh, as in hat, hen, hop", action: "Hold palm in front of mouth and breathe out gently saying hhh, hhh.", examples: ["hat", "hen", "hop"], howToWrite: "Start at the top line, pull straight down to the baseline, bounce up halfway, arch over to the right, and drop straight down to the baseline." },
  { id: 10, phonemeKey: "r", group: 2, grapheme: "r", upper: "R", ipa: "/r/", soundCue: "rrrrrr (puppy pulling a rag)", phonemeSpeak: "rrrrrr", speakText: "rrrrrr, as in rat, red, run", action: "Pretend to be a puppy tugging a rag, shaking head side to side saying rrrrr.", examples: ["rat", "red", "run"], howToWrite: "Start at the middle line, go straight down to the baseline, trace back up almost to the top of the stem, and curve smoothly over right like a small hook." },
  { id: 11, phonemeKey: "m", group: 2, grapheme: "m", upper: "M", ipa: "/m/", soundCue: "mmmmmm (rubbing tummy for tasty meal)", phonemeSpeak: "mmmmmm", speakText: "mmmmmm, as in mat, man, milk", action: "Rub your tummy in circles as if seeing tasty food and say mmmmm.", examples: ["mat", "man", "milk"], howToWrite: "Start at the middle line, go down to the baseline, bounce back up, make one arch down to the baseline, bounce up again, and make a second matching arch down." },
  { id: 12, phonemeKey: "d", group: 2, grapheme: "d", upper: "D", ipa: "/d/", soundCue: "duh-duh-duh (beating a drum)", phonemeSpeak: "duh", speakText: "duh, duh, duh, as in dog, drum, dad", action: "Beat hands up and down as if playing a drum saying duh, duh, duh.", examples: ["dog", "drum", "dad"], howToWrite: "Start like letter c (curve left around into a round circle on the baseline), continue straight UP to the top line, then retrace straight down to the baseline with a small flick." },

  // GROUP 3 (13–18)
  { id: 13, phonemeKey: "g", group: 3, grapheme: "g", upper: "G", ipa: "/ɡ/", soundCue: "guh-guh-guh (water gurgling down sink)", phonemeSpeak: "guh", speakText: "guh, guh, guh, as in goat, girl, gap", action: "Spiral hand downwards like water gurgling down a drain saying guh, guh, guh.", examples: ["goat", "girl", "gap"], howToWrite: "Make a neat round c-circle sitting on the baseline, go straight up to close it, then pull straight down below the baseline and curve left like a monkey's tail." },
  { id: 14, phonemeKey: "o", group: 3, grapheme: "o", upper: "O", ipa: "/ɒ/", soundCue: "aw-aw-aw (switching light on and off)", phonemeSpeak: "aw", speakText: "aw, aw, aw, as in orange, pot, dog", action: "Pretend to flip a light switch on and off saying aw, aw, aw.", examples: ["orange", "pot", "dog"], howToWrite: "Start just under the middle line on the right, curve smoothly counter-clockwise all the way around to the baseline and back up to close the circle cleanly." },
  { id: 15, phonemeKey: "u", group: 3, grapheme: "u", upper: "U", ipa: "/ʌ/", soundCue: "uh-uh-uh (putting up an umbrella)", phonemeSpeak: "uh", speakText: "uh, uh, uh, as in umbrella, up, cup", action: "Hold one hand steady and push the other up as if opening an umbrella saying uh, uh.", examples: ["umbrella", "up", "cup"], howToWrite: "Start at the middle line, go down and curve smoothly around the bottom up to the middle line, then retrace straight down to the baseline with a short flick." },
  { id: 16, phonemeKey: "l", group: 3, grapheme: "l", upper: "L", ipa: "/l/", soundCue: "llllll (licking a lollipop)", phonemeSpeak: "llllll", speakText: "llllll, as in leg, lion, lamp", action: "Pretend to lick a lollipop and say llllll.", examples: ["leg", "lion", "lamp"], howToWrite: "Start at the very top line and pull one clean tall straight stroke down to the baseline with a gentle small curve at the bottom." },
  { id: 17, phonemeKey: "f", group: 3, grapheme: "f", upper: "F", ipa: "/f/", soundCue: "ffffff (air escaping a floating fish)", phonemeSpeak: "ffffff", speakText: "ffffff, as in fish, fan, frog", action: "Bring hands gently together as air hisses out saying ffffff.", examples: ["fish", "fan", "frog"], howToWrite: "Start just under the top line, curve up and over to the left like a candy cane, pull straight down to the baseline, lift pen, and draw a neat crossbar at the middle line." },
  { id: 18, phonemeKey: "b", group: 3, grapheme: "b", upper: "B", ipa: "/b/", soundCue: "buh-buh-buh (hitting a ball with a bat)", phonemeSpeak: "buh", speakText: "buh, buh, buh, as in bat, ball, book", action: "Hold an imaginary bat and swing to hit a ball saying buh, buh, buh.", examples: ["bat", "ball", "book"], howToWrite: "Start at the top line, pull straight down to the baseline, bounce back up halfway to the middle line, and curve clockwise around to sit smoothly on the baseline." },

  // GROUP 4 (19–24)
  { id: 19, phonemeKey: "ai", group: 4, grapheme: "ai", upper: "AI", ipa: "/eɪ/", soundCue: "ayyy (cupping hand to ear)", phonemeSpeak: "ayyy", speakText: "ayyy, as in rain, train, snail", action: "Cup hand over ear as if asking 'ay?' and say ayyy.", examples: ["rain", "train", "snail"], howToWrite: "Write lowercase a (round circle + straight down stroke), then smoothly beside it write lowercase i (short down stroke + dot above)." },
  { id: 20, phonemeKey: "j", group: 4, grapheme: "j", upper: "J", ipa: "/dʒ/", soundCue: "juh-juh-juh (wobbling like jelly)", phonemeSpeak: "juh", speakText: "juh, juh, juh, as in jam, jet, jug", action: "Wobble like jelly on a plate and say juh, juh, juh.", examples: ["jam", "jet", "jug"], howToWrite: "Start at the middle line, pull straight down below the baseline and curve smoothly to the left like a fishhook, lift pen and add a single dot above the middle line." },
  { id: 21, phonemeKey: "oa", group: 4, grapheme: "oa", upper: "OA", ipa: "/əʊ/", soundCue: "ohhh (hand over mouth in surprise)", phonemeSpeak: "ohhh", speakText: "ohhh, as in boat, goat, coat", action: "Bring hand gently to mouth as if surprised saying ohhh!", examples: ["boat", "goat", "coat"], howToWrite: "Write a clean round lowercase o counter-clockwise, then right next to it write lowercase a sitting evenly on the same baseline." },
  { id: 22, phonemeKey: "ie", group: 4, grapheme: "ie", upper: "IE", ipa: "/aɪ/", soundCue: "eye (captain salute)", phonemeSpeak: "eye", speakText: "eye, as in tie, pie, cried", action: "Stand tall and salute like a sailor saying eye!", examples: ["tie", "pie", "cried"], howToWrite: "Write lowercase i (down stroke from middle to baseline + dot), followed closely by lowercase e (horizontal start across then loop around)." },
  { id: 23, phonemeKey: "ee", group: 4, grapheme: "ee", upper: "EE", ipa: "/iː/", soundCue: "eeee (donkey ears up)", phonemeSpeak: "eeee", speakText: "eeee, as in tree, bee, feet", action: "Put hands on head like donkey ears pointing up and say eeee.", examples: ["tree", "bee", "feet"], howToWrite: "Write two evenly spaced lowercase e letters side-by-side between the middle line and the baseline." },
  { id: 24, phonemeKey: "or", group: 4, grapheme: "or", upper: "OR", ipa: "/ɔː/", soundCue: "awr (donkey ears down)", phonemeSpeak: "awr", speakText: "awr, as in fork, corn, horn", action: "Drop hands down like donkey ears saying awr!", examples: ["fork", "corn", "horn"], howToWrite: "Write a smooth round lowercase o followed by lowercase r (down to baseline, back up and arch right)." },

  // GROUP 5 (25–30)
  { id: 25, phonemeKey: "z", group: 5, grapheme: "z", upper: "Z", ipa: "/z/", soundCue: "zzzzzz (buzzing bee)", phonemeSpeak: "zzzzzz", speakText: "zzzzzz, as in zip, zebra, buzz", action: "Flap elbows at sides like a buzzing bee saying zzzzzz.", examples: ["zip", "zebra", "buzz"], howToWrite: "Start at the middle left, draw straight across right, slant diagonally down left to the baseline, then slide straight across right along the baseline." },
  { id: 26, phonemeKey: "w", group: 5, grapheme: "w", upper: "W", ipa: "/w/", soundCue: "wuh-wuh-wuh (blowing wind onto palm)", phonemeSpeak: "wuh", speakText: "wuh, wuh, wuh, as in wind, web, water", action: "Blow gently onto open hands like the wind saying wuh, wuh, wuh.", examples: ["wind", "web", "water"], howToWrite: "Start at the middle line: slant down right, slant up right to middle, slant down right again, and slant up right — forming two crisp valleys." },
  { id: 27, phonemeKey: "ng", group: 5, grapheme: "ng", upper: "NG", ipa: "/ŋ/", soundCue: "nnng (lifting a heavy weight)", phonemeSpeak: "nnng", speakText: "nnng, as in ring, king, song", action: "Imagine lifting a heavy barbell overhead saying nnng!", examples: ["ring", "king", "song"], howToWrite: "Write lowercase n (down, up and one arch) followed immediately by lowercase g (round circle + tail curving below the baseline)." },
  { id: 28, phonemeKey: "v", group: 5, grapheme: "v", upper: "V", ipa: "/v/", soundCue: "vvvvvv (driving a van)", phonemeSpeak: "vvvvvv", speakText: "vvvvvv, as in van, vest, vase", action: "Hold an imaginary steering wheel driving a van saying vvvvvv.", examples: ["van", "vest", "vase"], howToWrite: "Start at the middle line, slant diagonally down right to a crisp point on the baseline, then slant diagonally up right back to the middle line." },
  { id: 29, phonemeKey: "oo_short", group: 5, grapheme: "oo (short)", upper: "oo", ipa: "/ʊ/", soundCue: "uuh (little oo — cuckoo clock forward)", phonemeSpeak: "uuh", speakText: "uuh, as in book, foot, wood", action: "Move head back and forth like a cuckoo clock: short uuh (as in book).", examples: ["book", "foot", "wood"], howToWrite: "Write two matched lowercase o circles sitting neatly side by side between the middle line and baseline." },
  { id: 30, phonemeKey: "oo_long", group: 5, grapheme: "oo (long)", upper: "OO", ipa: "/uː/", soundCue: "oooo (long oo — moon, spoon)", phonemeSpeak: "oooo", speakText: "oooo, as in moon, spoon, zoo", action: "Stretch hands forward for the long oooo sound as in moon.", examples: ["moon", "spoon", "zoo"], howToWrite: "Write two matched round o letters cleanly side by side, keeping both circles identical in height and roundness." },

  // GROUP 6 (31–36)
  { id: 31, phonemeKey: "y", group: 6, grapheme: "y", upper: "Y", ipa: "/j/", soundCue: "yuh-yuh-yuh (eating yellow yogurt)", phonemeSpeak: "yuh", speakText: "yuh, yuh, yuh, as in yellow, yam, yes", action: "Pretend to eat yogurt from a spoon saying yuh, yuh, yuh.", examples: ["yellow", "yam", "yes"], howToWrite: "Start at the middle line, make a smooth u-cup down and up, then pull straight down below the baseline and curve left into a tail." },
  { id: 32, phonemeKey: "x", group: 6, grapheme: "x", upper: "X", ipa: "/ks/", soundCue: "ksss (taking an X-ray picture)", phonemeSpeak: "ksss", speakText: "ksss, as in box, fox, six", action: "Pretend to click an X-ray camera saying ksss, ksss.", examples: ["box", "fox", "six"], howToWrite: "Start at middle left, slant diagonally down right to the baseline; lift pen to middle right, slant diagonally down left crossing exactly at the center." },
  { id: 33, phonemeKey: "ch", group: 6, grapheme: "ch", upper: "CH", ipa: "/tʃ/", soundCue: "chuh-chuh (steam train chugging)", phonemeSpeak: "chuh", speakText: "chuh, chuh, chuh, as in chair, chick, chin", action: "Move bent arms at sides like train wheels saying chuh, chuh, chuh!", examples: ["chair", "chick", "chin"], howToWrite: "Write curved lowercase c sitting between middle and baseline, followed by tall lowercase h (top-to-bottom stem + arch)." },
  { id: 34, phonemeKey: "sh", group: 6, grapheme: "sh", upper: "SH", ipa: "/ʃ/", soundCue: "shhhhh (quiet finger on lips)", phonemeSpeak: "shhhhh", speakText: "shhhhh, as in ship, shop, shell", action: "Place index finger gently over lips and say shhhhhh.", examples: ["ship", "shop", "shell"], howToWrite: "Write curving lowercase s between middle and baseline, followed closely by tall lowercase h." },
  { id: 35, phonemeKey: "th_voiced", group: 6, grapheme: "th (voiced)", upper: "th", ipa: "/ð/", soundCue: "thuh (gentle buzz — this, that, feather)", phonemeSpeak: "thuh", speakText: "thuh, as in this, that, feather", action: "Touch tip of tongue lightly behind top teeth and vibrate voice: thuh (this).", examples: ["this", "that", "feather"], howToWrite: "Write tall crossed lowercase t, then immediately beside it write tall arched lowercase h." },
  { id: 36, phonemeKey: "th_unvoiced", group: 6, grapheme: "th (unvoiced)", upper: "TH", ipa: "/θ/", soundCue: "thhhhh (soft breath — thumb, three, bath)", phonemeSpeak: "thhhhh", speakText: "thhhhh, as in thumb, three, bath", action: "Place tongue tip lightly between teeth and blow softly without voice: thhhhh (thumb).", examples: ["thumb", "three", "bath"], howToWrite: "Write tall lowercase t with neat crossbar at middle line, followed cleanly by tall lowercase h." },

  // GROUP 7 (37–42)
  { id: 37, phonemeKey: "qu", group: 7, grapheme: "qu", upper: "QU", ipa: "/kw/", soundCue: "kwuh (duck quacking)", phonemeSpeak: "kwuh", speakText: "kwuh, kwuh, as in queen, quick, quilt", action: "Make a duck beak with hands opening and closing saying kwuh, kwuh.", examples: ["queen", "quick", "quilt"], howToWrite: "Write lowercase q (counter-clockwise circle, straight down below baseline with small upward flick right), always paired with lowercase u beside it." },
  { id: 38, phonemeKey: "ou", group: 7, grapheme: "ou", upper: "OU", ipa: "/aʊ/", soundCue: "owww! (pricking thumb on needle)", phonemeSpeak: "owww", speakText: "owww, as in cloud, house, mouth", action: "Pretend to prick thumb gently and say owww!", examples: ["cloud", "house", "mouth"], howToWrite: "Write a clean round lowercase o followed evenly by a rounded lowercase u with its straight finishing stroke." },
  { id: 39, phonemeKey: "oi", group: 7, grapheme: "oi", upper: "OI", ipa: "/ɔɪ/", soundCue: "oyyy! (ship ahoy call)", phonemeSpeak: "oyyy", speakText: "oyyy, as in coin, oil, soil", action: "Cup hands around mouth and call to a passing ship: oyyy!", examples: ["coin", "oil", "soil"], howToWrite: "Write a smooth round lowercase o followed by lowercase i with its crisp top dot." },
  { id: 40, phonemeKey: "ue", group: 7, grapheme: "ue", upper: "UE", ipa: "/juː/", soundCue: "yooo (pointing to a friend)", phonemeSpeak: "yooo", speakText: "yooo, as in blue, glue, statue", action: "Point playfully toward a friend saying yooo!", examples: ["blue", "glue", "statue"], howToWrite: "Write lowercase u (down, curve up, straight down) followed cleanly by lowercase e." },
  { id: 41, phonemeKey: "er", group: 7, grapheme: "er", upper: "ER", ipa: "/ɜː/", soundCue: "urrr (whirring mixer)", phonemeSpeak: "urrr", speakText: "urrr, as in herb, sister, water", action: "Roll hands over each other like a food mixer saying urrr.", examples: ["herb", "sister", "water"], howToWrite: "Write lowercase e (horizontal start then loop around), followed closely by lowercase r (down, trace up, hook right)." },
  { id: 42, phonemeKey: "ar", group: 7, grapheme: "ar", upper: "AR", ipa: "/ɑː/", soundCue: "ahhh (opening wide at doctor)", phonemeSpeak: "ahhh", speakText: "ahhh, as in car, star, farm", action: "Open mouth wide as if at the doctor and say ahhh.", examples: ["car", "star", "farm"], howToWrite: "Write round lowercase a with its vertical downstroke, followed by lowercase r arching right." }
];

// Helper to build standard Latin alphabet entries with authentic letter-formation steps
const LATIN_STROKE_GUIDES = {
  A: "Capital A: Slant down left from apex, slant down right from apex, cross horizontally at midpoint. Lowercase a: Curve left into a circle, up to close, straight down with flick.",
  B: "Capital B: Vertical line down, then two stacked right-facing loops. Lowercase b: Tall vertical stem down, bounce halfway up, loop clockwise around to baseline.",
  C: "Start at upper right and draw one smooth open curve counter-clockwise down to the baseline and slightly up.",
  D: "Capital D: Vertical stem down, then one wide curved belly from top to bottom. Lowercase d: Round c-circle first, continue straight up tall, trace back down.",
  E: "Capital E: Tall vertical stem down, then three horizontal bars (top, middle, bottom). Lowercase e: Short horizontal line right, then curve up and around counter-clockwise.",
  F: "Capital F: Tall vertical stem down, horizontal top bar, shorter middle bar. Lowercase f: Hook left over top, pull straight down, cross at middle line.",
  G: "Capital G: Draw a C curve, rise to midpoint and tuck inward horizontally. Lowercase g: Round circle on baseline, straight down below line and curl left.",
  H: "Capital H: Two parallel tall vertical lines joined by a middle horizontal crossbar. Lowercase h: Tall vertical line down, bounce halfway up, arch right and down.",
  I: "Capital I: Straight vertical stem with crisp top and bottom horizontal bars. Lowercase i: Short vertical line from middle to baseline + single dot above.",
  J: "Capital J: Pull down and hook smoothly left at bottom (optional top bar). Lowercase j: Pull down below baseline, hook left, add single dot on top.",
  K: "Tall vertical line down; lift pen, slant diagonally inward to center of stem, then slant diagonally outward down to the baseline.",
  L: "Capital L: Straight vertical stem down, then straight horizontal foot right. Lowercase l: One tall clean vertical line down to baseline.",
  M: "Capital M: Vertical down, diagonal down to center, diagonal up right, vertical down. Lowercase m: Down, bounce up for first arch, bounce up for second arch.",
  N: "Capital N: Vertical down, diagonal slant down right, vertical straight up. Lowercase n: Short vertical down, bounce back up, arch right and down.",
  O: "Start near the top and glide smoothly counter-clockwise in one complete oval/circle back to the starting point.",
  P: "Capital P: Tall vertical stem down, one upper-right closed loop. Lowercase p: Stem drops below baseline, trace up and loop clockwise on the baseline.",
  Q: "Capital Q: Full round O circle + short diagonal tail crossing bottom right. Lowercase q: Round circle, straight down below baseline with crisp right flick.",
  R: "Capital R: Tall stem down, upper-right loop, diagonal leg kicking down right. Lowercase r: Short stem down, trace up and curve right like a small hook.",
  S: "Start top right, curve left over top, glide smoothly right across middle, curve back left along the baseline.",
  T: "Capital T: Horizontal bar across top, then straight vertical stem down center. Lowercase t: Tall stem down with tiny foot curl, crossed horizontally at middle.",
  U: "Pull down, curve smoothly around the bottom, rise straight back up (lowercase u retraces straight down to baseline).",
  V: "Slant diagonally down right to a crisp point on the baseline, then slant diagonally up right to the same height.",
  W: "Slant down, up to middle, down again, and up — four crisp diagonal strokes forming double valleys.",
  X: "Slant diagonally down right, lift pen, slant diagonally down left crossing smoothly at the exact center.",
  Y: "Capital Y: Short V on top + vertical stem down center. Lowercase y: Curved u-cup then straight down below baseline curving left.",
  Z: "Horizontal bar across top right, diagonal slant down left to baseline, horizontal bar right along baseline."
};

const PURE_PHONEME_FALLBACK = {
  A: "ah", B: "buh", C: "kuh", D: "duh", E: "eh", F: "ffffff", G: "guh", H: "huh",
  I: "ih", J: "juh", K: "kuh", L: "llllll", M: "mmmmmm", N: "nnnnnn", O: "aw",
  P: "puh", Q: "kwuh", R: "rrrrrr", S: "ssssss", T: "tuh", U: "uh", V: "vvvvvv",
  W: "wuh", X: "ksss", Y: "yuh", Z: "zzzzzz",
  "Ɛ": "ehh", "Ɔ": "aww", "Ŋ": "nnng", "Ɖ": "duh", "Ƒ": "ffffff", "Ɣ": "ghuh", "Ʋ": "vvvvvv",
  "Ɓ": "buh", "Ɗ": "duh", "Ƙ": "kuh", "Ƴ": "yuh", "Ẹ": "ehh", "Ọ": "aww", "Ṣ": "shhhhh",
  KY: "chuh", GY: "juh", TW: "chwuh", DW: "jwuh", NY: "nyuh", GB: "gbuh", KP: "kpuh", TS: "tsuh",
  CH: "chuh", SH: "shhhhh", "NG'": "nnng", HL: "hluh",
  "É": "ay", "È": "eh", "Ê": "eh", "Ç": "ssssss", "À": "ah",
  "Ä": "ehh", "Ö": "uhh", "Ü": "ooo", "ß": "ssssss", "Ñ": "nyuh", "Ã": "ahng", "Õ": "ohng"
};

function makeLatinEntry(upper, lower, sound, example, customWrite = null, speakOverride = null) {
  const pureSound = PURE_PHONEME_FALLBACK[String(upper || "").toUpperCase()] || lower || "ah";
  const exampleWord = String(example || "").split("(")[0].trim();
  return {
    letter: `${upper} ${lower}`,
    glyph: lower,
    upper,
    name: upper,
    sound,
    phonemeSpeak: pureSound,
    speakText: speakOverride || `${pureSound}, as in ${exampleWord}`,
    example,
    howToWrite: customWrite || LATIN_STROKE_GUIDES[upper] || `Write ${upper} cleanly from top to baseline following left-to-right stroke flow.`
  };
}

const ENGLISH_ALPHABET = [
  makeLatinEntry("A", "a", "/æ/ or /eɪ/ (ant, apple)", "Apple"),
  makeLatinEntry("B", "b", "/b/ (bat, ball)", "Ball"),
  makeLatinEntry("C", "c", "/k/ or /s/ (cat, city)", "Cat"),
  makeLatinEntry("D", "d", "/d/ (dog, drum)", "Dog"),
  makeLatinEntry("E", "e", "/e/ or /iː/ (egg, eagle)", "Egg"),
  makeLatinEntry("F", "f", "/f/ (fish, fan)", "Fish"),
  makeLatinEntry("G", "g", "/ɡ/ or /dʒ/ (goat, gem)", "Goat"),
  makeLatinEntry("H", "h", "/h/ (hat, house)", "Hat"),
  makeLatinEntry("I", "i", "/ɪ/ or /aɪ/ (ink, ice)", "Ink"),
  makeLatinEntry("J", "j", "/dʒ/ (jam, jug)", "Jam"),
  makeLatinEntry("K", "k", "/k/ (kite, king)", "Kite"),
  makeLatinEntry("L", "l", "/l/ (lion, lamp)", "Lion"),
  makeLatinEntry("M", "m", "/m/ (mat, moon)", "Moon"),
  makeLatinEntry("N", "n", "/n/ (net, nest)", "Nest"),
  makeLatinEntry("O", "o", "/ɒ/ or /əʊ/ (orange, open)", "Orange"),
  makeLatinEntry("P", "p", "/p/ (pan, pencil)", "Pencil"),
  makeLatinEntry("Q", "q", "/kw/ (queen, quilt)", "Queen"),
  makeLatinEntry("R", "r", "/r/ (rain, red)", "Rain"),
  makeLatinEntry("S", "s", "/s/ (sun, snake)", "Sun"),
  makeLatinEntry("T", "t", "/t/ (tap, tree)", "Tree"),
  makeLatinEntry("U", "u", "/ʌ/ or /juː/ (umbrella, unit)", "Umbrella"),
  makeLatinEntry("V", "v", "/v/ (van, violin)", "Van"),
  makeLatinEntry("W", "w", "/w/ (water, wind)", "Water"),
  makeLatinEntry("X", "x", "/ks/ (box, x-ray)", "Box"),
  makeLatinEntry("Y", "y", "/j/ (yam, yellow)", "Yellow"),
  makeLatinEntry("Z", "z", "/z/ (zebra, zip)", "Zebra")
];

const TWI_AKAN_ALPHABET = [
  makeLatinEntry("A", "a", "/a/ (ah — as in aba, akwaaba)", "Akwaaba (Welcome)"),
  makeLatinEntry("B", "b", "/b/ (ba — as in baako)", "Baako (One)"),
  makeLatinEntry("D", "d", "/d/ (da — as in daabi)", "Daabi (No)"),
  makeLatinEntry("E", "e", "/e/ (ay — close e as in efie)", "Efie (House)"),
  makeLatinEntry("Ɛ", "ɛ", "/ɛ/ (eh — open e as in ɛna, ɛyɛ)", "Ɛyɛ (It is good)", "Draw a reversed number 3 (two stacked open curves facing right, sitting cleanly between middle and baseline for lowercase ɛ, tall for Ɛ).", "Open E, eh, as in eyeh"),
  makeLatinEntry("F", "f", "/f/ (fa — as in fɛfɛ)", "Fɛfɛ (Beautiful)"),
  makeLatinEntry("G", "g", "/ɡ/ (ga — as in gua)", "Gua (Market)"),
  makeLatinEntry("H", "h", "/h/ (ha — as in ha)", "Hena (Who)"),
  makeLatinEntry("I", "i", "/i/ (ee — as in din)", "Din (Name)"),
  makeLatinEntry("K", "k", "/k/ (ka — as in kasa)", "Kasa (Language)"),
  makeLatinEntry("L", "l", "/l/ (la — loanwords)", "Lɔre (Lorry/Bus)"),
  makeLatinEntry("M", "m", "/m/ (ma — as in maame)", "Maame (Mother)"),
  makeLatinEntry("N", "n", "/n/ (na — as in nsuo)", "Nsuo (Water)"),
  makeLatinEntry("O", "o", "/o/ (oh — close o as in obaa)", "Obaa (Woman)"),
  makeLatinEntry("Ɔ", "ɔ", "/ɔ/ (aw — open o as in ɔman, ɔkasa)", "Ɔman (Nation)", "Draw a backwards C (start upper left, curve clockwise smoothly around to the right and bottom left, leaving the left side open).", "Open O, aw, as in oman"),
  makeLatinEntry("P", "p", "/p/ (pa — as in paapa)", "Paapa (Father)"),
  makeLatinEntry("R", "r", "/r/ (ra — rolled r as in bra)", "Bra (Come)"),
  makeLatinEntry("S", "s", "/s/ (sa — as in sukuu)", "Sukuu (School)"),
  makeLatinEntry("T", "t", "/t/ (ta — as in tɛkrɛma)", "Tɛkrɛma (Tongue)"),
  makeLatinEntry("U", "u", "/u/ (oo — as in aduane)", "Aduane (Food)"),
  makeLatinEntry("W", "w", "/w/ (wa — as in wɔfa)", "Wɔfa (Uncle)"),
  makeLatinEntry("Y", "y", "/j/ (ya — as in yɛn)", "Yɛn (Us / We)"),
  makeLatinEntry("KY", "ky", "/tɕ/ (ch — as in kyerɛkyerɛni)", "Kyerɛkyerɛni (Teacher)", "Write k cleanly followed by y with its descending left-curving tail.", "K Y says ch, as in kyerekyereni"),
  makeLatinEntry("GY", "gy", "/dʑ/ (j — as in agya)", "Agya (Father)", "Write g with its lower tail followed smoothly by y.", "G Y says j, as in agya"),
  makeLatinEntry("TW", "tw", "/tɕʷ/ (ch-w — as in Twi)", "Twi (Akan Language)", "Write tall crossed t followed evenly by w.", "T W says ch-w, as in Twi"),
  makeLatinEntry("DW", "dw", "/dʑʷ/ (j-w — as in adwuma)", "Adwuma (Work)", "Write tall d followed evenly by w.", "D W says j-w, as in adwuma"),
  makeLatinEntry("NY", "ny", "/ɲ/ (ny — as in Onyame)", "Onyame (God)", "Write lowercase n followed closely by lowercase y.", "N Y says nyah, as in Onyame")
];

const GA_ALPHABET = [
  makeLatinEntry("A", "a", "/a/ (ah — as in atade)", "Atade (Dress)"),
  makeLatinEntry("B", "b", "/b/ (ba — as in ba)", "Ba (Come)"),
  makeLatinEntry("D", "d", "/d/ (da — as in daa)", "Daa (Daily)"),
  makeLatinEntry("E", "e", "/e/ (ay — close e)", "Ehe (Where)"),
  makeLatinEntry("Ɛ", "ɛ", "/ɛ/ (eh — open e as in fɛo)", "Fɛo (Beauty)", "Draw two smooth stacked curves opening right like a mirrored 3.", "Open E, eh, as in feo"),
  makeLatinEntry("F", "f", "/f/ (fa — as in fa)", "Fa (Take)"),
  makeLatinEntry("G", "g", "/ɡ/ (ga — as in Ga)", "Gã (Ga Language)"),
  makeLatinEntry("H", "h", "/h/ (ha — as in ha)", "Hã (Give)"),
  makeLatinEntry("I", "i", "/i/ (ee — as in bi)", "Bi (Child)"),
  makeLatinEntry("J", "j", "/dʒ/ (j — as in jɛi)", "Jɛi (There)"),
  makeLatinEntry("K", "k", "/k/ (ka — as in kane)", "Kane (Light)"),
  makeLatinEntry("L", "l", "/l/ (la — as in lala)", "Lala (Song)"),
  makeLatinEntry("M", "m", "/m/ (ma — as in maŋ)", "Maŋ (Town/Nation)"),
  makeLatinEntry("N", "n", "/n/ (na — as in nu)", "Nu (Water)"),
  makeLatinEntry("Ŋ", "ŋ", "/ŋ/ (ng — eng as in ŋɔɔ, ŋmɛ)", "Ŋmɛ (Bell/Time)", "Write lowercase n, then extend the right vertical leg straight down below the baseline and hook cleanly to the left.", "Eng says ng, as in mang"),
  makeLatinEntry("O", "o", "/o/ (oh — close o)", "Ojogbaa (Well / Fine)"),
  makeLatinEntry("Ɔ", "ɔ", "/ɔ/ (aw — open o as in nɔ)", "Nɔ (Thing)", "Write a backwards C curving clockwise with its opening on the left.", "Open O, aw"),
  makeLatinEntry("P", "p", "/p/ (pa — as in papa)", "Papa (Good)"),
  makeLatinEntry("R", "r", "/r/ (ra — rolled r)", "Rɛdio (Radio)"),
  makeLatinEntry("S", "s", "/s/ (sa — as in skul)", "Skul (School)"),
  makeLatinEntry("T", "t", "/t/ (ta — as in tsɔɔlɔ)", "Tsɔɔlɔ (Teacher)"),
  makeLatinEntry("U", "u", "/u/ (oo — as in shia)", "Shia (Home)"),
  makeLatinEntry("V", "v", "/v/ (va — as in vɔ)", "Vɔ (Deep)"),
  makeLatinEntry("W", "w", "/w/ (wa — as in wolo)", "Wolo (Book)"),
  makeLatinEntry("Y", "y", "/j/ (ya — as in yoo)", "Yoo (Woman)"),
  makeLatinEntry("Z", "z", "/z/ (za — as in zɛro)", "Zɛro (Zero)"),
  makeLatinEntry("GB", "gb", "/ɡ͡b/ (co-articulated gb as in gbekɛ)", "Gbekɛ (Child)", "Write g with lower loop followed closely by tall b.", "G B co-articulated sound, as in gbeke"),
  makeLatinEntry("KP", "kp", "/k͡p/ (co-articulated kp as in kpa)", "Kpa (Stop)", "Write tall k followed closely by descending p.", "K P co-articulated sound, as in kpa")
];

const EWE_ALPHABET = [
  makeLatinEntry("A", "a", "/a/ (ah — as in ati)", "Ati (Tree)"),
  makeLatinEntry("B", "b", "/b/ (ba — as in bɔl)", "Bɔl (Ball)"),
  makeLatinEntry("D", "d", "/d/ (dental d as in dɔ)", "Dɔ (Work)"),
  makeLatinEntry("Ɖ", "ɖ", "/ɖ/ (retroflex d — tongue curled back)", "Ɖevi (Child)", "Lowercase ɖ: Write lowercase d, then curve the top of the tall stem gently over to the right like a hook. Uppercase Ɖ: Capital D with a short horizontal crossbar through the left stem.", "Retroflex D, as in devi"),
  makeLatinEntry("E", "e", "/e/ (ay — close e)", "Eʋe (Ewe)"),
  makeLatinEntry("Ɛ", "ɛ", "/ɛ/ (eh — open e)", "Ɛ̃ (Yes)", "Two stacked right-opening curves like a mirrored 3.", "Open E, eh"),
  makeLatinEntry("F", "f", "/f/ (labiodental f)", "Fia (Chief/King)"),
  makeLatinEntry("Ƒ", "ƒ", "/ɸ/ (bilabial f — blowing with both lips)", "Ƒome (Family)", "Start curved over the top like f, pull straight down below the baseline and curve left at the bottom, then cross cleanly at the middle line.", "Bilabial F, blowing softly with both lips, as in fome"),
  makeLatinEntry("G", "g", "/ɡ/ (ga — hard g)", "Ga (Money/Metal)"),
  makeLatinEntry("Ɣ", "ɣ", "/ɣ/ (voiced velar fricative)", "Ɣe (Sun)", "Start top left, slant down right below the baseline and loop gently back up right, similar to a curved Greek gamma.", "Gamma sound gh, as in ghe meaning sun"),
  makeLatinEntry("H", "h", "/h/ (ha — as in ha)", "Ha (Song)"),
  makeLatinEntry("I", "i", "/i/ (ee — as in dzi)", "Dzi (Heart/Sky)"),
  makeLatinEntry("K", "k", "/k/ (ka — as in kɔ)", "Kɔ (Neck)"),
  makeLatinEntry("L", "l", "/l/ (la — as in lɔlɔ̃)", "Lɔlɔ̃ (Love)"),
  makeLatinEntry("M", "m", "/m/ (ma — as in Mawu)", "Mawu (God)"),
  makeLatinEntry("N", "n", "/n/ (na — as in nu)", "Nu (Mouth/Thing)"),
  makeLatinEntry("Ŋ", "ŋ", "/ŋ/ (ng — eng as in ŋkɔ)", "Ŋkɔ (Name)", "Write lowercase n and extend its right leg below the baseline curving smoothly left.", "Eng says ng, as in nko"),
  makeLatinEntry("O", "o", "/o/ (oh — close o)", "Woezɔ (Welcome)"),
  makeLatinEntry("Ɔ", "ɔ", "/ɔ/ (aw — open o)", "Ɔfisi (Office)", "Draw a backwards C facing left.", "Open O, aw"),
  makeLatinEntry("P", "p", "/p/ (pa — as in papa)", "Papa (Father)"),
  makeLatinEntry("R", "r", "/r/ (ra — rolled r)", "Sukuu (School)"),
  makeLatinEntry("S", "s", "/s/ (sa — as in sukuu)", "Sukuu (School)"),
  makeLatinEntry("T", "t", "/t/ (ta — as in tsi)", "Tsi (Water)"),
  makeLatinEntry("U", "u", "/u/ (oo — as in ʋu)", "Ʋu (Vehicle/Drum)"),
  makeLatinEntry("V", "v", "/v/ (labiodental v)", "Va (Come)"),
  makeLatinEntry("Ʋ", "ʋ", "/β/ (bilabial v — vibrating both lips)", "Eʋegbe (Ewe Language)", "Draw a rounded V with gentle curved upper tips flaring slightly outward like a soft U-V hybrid.", "Bilabial V, vibrating both lips, as in Ewegbe"),
  makeLatinEntry("W", "w", "/w/ (wa — as in wò)", "Woezɔ (Welcome)"),
  makeLatinEntry("X", "x", "/x/ (voiceless velar kh as in xɔ)", "Xɔ (House/Receive)"),
  makeLatinEntry("Y", "y", "/j/ (ya — as in ya)", "Ya (Air/Wind)"),
  makeLatinEntry("Z", "z", "/z/ (za — as in zã)", "Zã (Night)")
];

const HAUSA_ALPHABET = [
  ...ENGLISH_ALPHABET.filter((x) => !["P", "Q", "V", "X"].includes(x.upper)),
  makeLatinEntry("Ɓ", "ɓ", "/ɓ/ (implosive b — hooked b)", "Ɓera (Mouse)", "Write tall lowercase b and curve the top tip of the stem gently over to the right like a hook.", "Implosive hooked B, as in bera"),
  makeLatinEntry("Ɗ", "ɗ", "/ɗ/ (implosive d — hooked d)", "Ɗaki (Room)", "Write lowercase d and add a smooth rightward hook at the very top of its tall stem.", "Implosive hooked D, as in daki"),
  makeLatinEntry("Ƙ", "ƙ", "/kʼ/ (ejective k — hooked k)", "Ƙasa (Country/Earth)", "Write lowercase k with a smooth top hook curving over to the right.", "Ejective hooked K, as in kasa"),
  makeLatinEntry("Ƴ", "ƴ", "/ʔʲ/ (glottalized y — hooked y)", "Ƴaƴa (Children)", "Write lowercase y with a curved hook on its right upper arm.", "Hooked Y, as in yaya meaning children"),
  makeLatinEntry("TS", "ts", "/sʼ/ (ejective ts as in tsada)", "Tsada (Expensive)", "Write tall crossed t followed closely by lowercase s.", "T S sound, as in tsada")
];

const YORUBA_ALPHABET = [
  makeLatinEntry("A", "a", "/a/ (ah — as in ajá)", "Ajá (Dog)"),
  makeLatinEntry("B", "b", "/b/ (ba — as in bàbá)", "Bàbá (Father)"),
  makeLatinEntry("D", "d", "/d/ (da — as in dára)", "Dára (Good)"),
  makeLatinEntry("E", "e", "/e/ (ay — close e as in ewé)", "Ewé (Leaf)"),
  makeLatinEntry("Ẹ", "ẹ", "/ɛ/ (eh — open e with underdot)", "Ẹja (Fish)", "Write standard E / e, then place a single neat dot directly underneath the baseline.", "E with underdot says eh, as in eja"),
  makeLatinEntry("F", "f", "/f/ (fa — as in fìlà)", "Fìlà (Cap)"),
  makeLatinEntry("G", "g", "/ɡ/ (ga — as in gíga)", "Gíga (Tall)"),
  makeLatinEntry("GB", "gb", "/ɡ͡b/ (co-articulated gb as in gbà)", "Gbà (Receive)", "Write lowercase g followed closely by tall lowercase b.", "G B co-articulated sound, as in gba"),
  makeLatinEntry("H", "h", "/h/ (ha — as in hó)", "Hó (Boil)"),
  makeLatinEntry("I", "i", "/i/ (ee — as in ilé)", "Ilé (House)"),
  makeLatinEntry("J", "j", "/dʒ/ (ja — as in jẹ)", "Jẹ (Eat)"),
  makeLatinEntry("K", "k", "/k/ (ka — as in kí)", "Kí (Greet)"),
  makeLatinEntry("L", "l", "/l/ (la — as in lọ)", "Lọ (Go)"),
  makeLatinEntry("M", "m", "/m/ (ma — as in màmá)", "Màmá (Mother)"),
  makeLatinEntry("N", "n", "/n/ (na — as in náà)", "Náà (Also)"),
  makeLatinEntry("O", "o", "/o/ (oh — close o as in omi)", "Omi (Water)"),
  makeLatinEntry("Ọ", "ọ", "/ɔ/ (aw — open o with underdot)", "Ọmọ (Child)", "Write standard round O / o, then place one crisp dot centered right below the baseline.", "O with underdot says aw, as in omo"),
  makeLatinEntry("P", "p", "/k͡p/ (kp sound as in púpọ̀)", "Púpọ̀ (Many)", "Standard P / p stroke; pronounced with both lips and back of tongue together (kp)."),
  makeLatinEntry("R", "r", "/ɾ/ (tapped r as in rí)", "Rí (See)"),
  makeLatinEntry("S", "s", "/s/ (sa — as in sùn)", "Sùn (Sleep)"),
  makeLatinEntry("Ṣ", "ṣ", "/ʃ/ (sh — s with underdot)", "Ṣe (Do)", "Write standard S / s, then place one neat dot directly beneath the bottom curve.", "S with underdot says sh, as in she"),
  makeLatinEntry("T", "t", "/t/ (ta — as in tà)", "Tà (Sell)"),
  makeLatinEntry("U", "u", "/u/ (oo — as in ìwé)", "Ìlú (Town)"),
  makeLatinEntry("W", "w", "/w/ (wa — as in wá)", "Wá (Come)"),
  makeLatinEntry("Y", "y", "/j/ (ya — as in yọ̀)", "Yọ̀ (Rejoice)")
];

const SWAHILI_ALPHABET = [
  ...ENGLISH_ALPHABET.filter((x) => !["Q", "X"].includes(x.upper)).map((entry) => {
    const swExamples = {
      A: "Asante (Thank you)", B: "Baba (Father)", C: "Chai (Tea)", D: "Darasa (Class)", E: "Elimu (Education)",
      F: "Furaha (Joy)", G: "Gari (Car)", H: "Habari (News)", I: "Imba (Sing)", J: "Jambo (Hello)",
      K: "Kitabu (Book)", L: "Lugha (Language)", M: "Mwalimu (Teacher)", N: "Nchi (Country)", O: "Ona (See)",
      P: "Paka (Cat)", R: "Rafiki (Friend)", S: "Shule (School)", T: "Tunda (Fruit)", U: "Umoja (Unity)",
      V: "Viatu (Shoes)", W: "Watoto (Children)", Y: "Yai (Egg)", Z: "Zebra (Punda milia)"
    };
    return { ...entry, example: swExamples[entry.upper] || entry.example, speakText: `${entry.upper}, ${swExamples[entry.upper]?.split(" ")[0] || entry.example}` };
  }),
  makeLatinEntry("CH", "ch", "/tʃ/ (ch as in chakula)", "Chakula (Food)", "Write curved c followed by tall h."),
  makeLatinEntry("NG'", "ng'", "/ŋ/ (ng as in ng'ombe)", "Ng'ombe (Cow)", "Write n, then g, followed by an apostrophe at upper right."),
  makeLatinEntry("NY", "ny", "/ɲ/ (ny as in nyumba)", "Nyumba (House)", "Write n followed cleanly by y."),
  makeLatinEntry("SH", "sh", "/ʃ/ (sh as in shule)", "Shule (School)", "Write curved s followed by tall h.")
];

const ZULU_ALPHABET = [
  ...ENGLISH_ALPHABET.map((entry) => {
    if (entry.upper === "C") return makeLatinEntry("C", "c", "/ǀ/ (dental click — tip of tongue behind teeth)", "Cula (Sing)", LATIN_STROKE_GUIDES.C, "Zulu dental click C, as in cula");
    if (entry.upper === "Q") return makeLatinEntry("Q", "q", "/ǃ/ (palatal click — cork pop sound)", "Qala (Start)", LATIN_STROKE_GUIDES.Q, "Zulu palatal click Q, as in qala");
    if (entry.upper === "X") return makeLatinEntry("X", "x", "/ǁ/ (lateral click — side of tongue)", "Xoxa (Talk)", LATIN_STROKE_GUIDES.X, "Zulu lateral click X, as in xoxa");
    return entry;
  }),
  makeLatinEntry("HL", "hl", "/ɬ/ (voiceless lateral fricative)", "Hlala (Sit/Stay)", "Write tall h followed cleanly by tall l.")
];

const FRENCH_ALPHABET = [
  ...ENGLISH_ALPHABET.map((e) => ({ ...e, speakText: `${e.upper}` })),
  makeLatinEntry("É", "é", "/e/ (e accent aigu — école)", "École (School)", "Write E / e, then draw a short upward slash sloping bottom-left to top-right above it.", "é, comme école"),
  makeLatinEntry("È", "è", "/ɛ/ (e accent grave — élève)", "Élève (Student)", "Write E / e, then draw a short downward slash sloping top-left to bottom-right above it.", "è, comme élève"),
  makeLatinEntry("Ê", "ê", "/ɛ/ (e circonflexe — fête)", "Fête (Celebration)", "Write E / e, then place a tiny peaked roof (^) centered above it.", "ê, comme fête"),
  makeLatinEntry("Ç", "ç", "/s/ (c cédille — français)", "Français (French)", "Write C / c, then add a tiny curved hook underneath the bottom center.", "ç, comme français"),
  makeLatinEntry("À", "à", "/a/ (a accent grave — là)", "À l'école (At school)", "Write A / a, then add a short downward grave accent above.", "à, comme à l'école")
];

const GERMAN_ALPHABET = [
  ...ENGLISH_ALPHABET.map((e) => ({ ...e, speakText: `${e.upper}` })),
  makeLatinEntry("Ä", "ä", "/ɛː/ (A-Umlaut — Äpfel)", "Äpfel (Apples)", "Write A / a, then place two neat horizontal dots directly above it.", "Ä, wie Äpfel"),
  makeLatinEntry("Ö", "ö", "/øː/ (O-Umlaut — Öffnen)", "Öffnen (Open)", "Write O / o, then place two neat horizontal dots above it.", "Ö, wie Öffnen"),
  makeLatinEntry("Ü", "ü", "/yː/ (U-Umlaut — Übung)", "Übung (Exercise)", "Write U / u, then place two neat horizontal dots above it.", "Ü, wie Übung"),
  makeLatinEntry("ß", "ß", "/s/ (Eszett / sharp S — Straße)", "Straße (Street)", "Start at the baseline, pull straight up tall, curve smoothly right at the top into a double B-like rounded right side ending above the baseline.", "Eszett, wie Straße")
];

const SPANISH_ALPHABET = [
  ...ENGLISH_ALPHABET.slice(0, 14).map((e) => ({ ...e, speakText: `${e.upper}` })),
  makeLatinEntry("Ñ", "ñ", "/ɲ/ (eñe — ny sound as in niño)", "Niño (Child)", "Write N / n cleanly, then draw a smooth wavy tilde (~) centered above it.", "Eñe, como niño"),
  ...ENGLISH_ALPHABET.slice(14).map((e) => ({ ...e, speakText: `${e.upper}` }))
];

const PORTUGUESE_ALPHABET = [
  ...ENGLISH_ALPHABET.map((e) => ({ ...e, speakText: `${e.upper}` })),
  makeLatinEntry("Ã", "ã", "/ɐ̃/ (nasal A — manhã)", "Manhã (Morning)", "Write A / a, then add a smooth wavy tilde (~) above it.", "Ã, como manhã"),
  makeLatinEntry("Õ", "õ", "/õ/ (nasal O — lições)", "Lições (Lessons)", "Write O / o, then add a wavy tilde (~) above it.", "Õ, como lições"),
  makeLatinEntry("Ç", "ç", "/s/ (cê-cedilha — educação)", "Educação (Education)", "Write C / c with a small curved cedilla hook underneath.", "Ç, como educação")
];

const ARABIC_ALPHABET = [
  ["ا", "Alif", "/aː/ (long a)", "أسد (Asad — Lion)", "Draw one clean straight vertical stroke from top down to the baseline (Right-to-Left script)."],
  ["ب", "Baa", "/b/ (b)", "باب (Bab — Door)", "From right to left, draw a shallow boat shape along the baseline and place 1 dot underneath."],
  ["ت", "Taa", "/t/ (t)", "تفاح (Tuffah — Apple)", "Draw the same shallow boat shape right-to-left and place 2 dots above."],
  ["ث", "Thaa", "/θ/ (th as in three)", "ثعلب (Thalab — Fox)", "Draw the shallow boat shape right-to-left and place 3 dots in a pyramid above."],
  ["ج", "Jeem", "/dʒ/ (j)", "جمل (Jamal — Camel)", "Start above line going right, curve back left and sweep into a big belly below the line with 1 dot inside."],
  ["ح", "Haa", "/ħ/ (deep h)", "حليب (Halib — Milk)", "Same sweeping shape as Jeem, cleanly written with zero dots."],
  ["خ", "Khaa", "/x/ (kh)", "خبز (Khubz — Bread)", "Same sweeping shape as Jeem with 1 dot centered above the top arch."],
  ["د", "Daal", "/d/ (d)", "درس (Dars — Lesson)", "Start slightly above the baseline, slant down-right then curve left along the baseline."],
  ["ذ", "Dhaal", "/ð/ (voiced th)", "ذهب (Dhahab — Gold)", "Same angled curve as Daal with 1 dot placed cleanly above."],
  ["ر", "Raa", "/r/ (rolled r)", "رسم (Rasm — Drawing)", "Start just above line and glide smoothly downward-left in a gentle crescent below the baseline."],
  ["ز", "Zaay", "/z/ (z)", "زهرة (Zahra — Flower)", "Same downward-left crescent as Raa with 1 dot above."],
  ["س", "Seen", "/s/ (s)", "سمك (Samak — Fish)", "Right-to-left: draw two small shallow u-teeth on the line, then sweep down into a deep rounded bowl."],
  ["ش", "Sheen", "/ʃ/ (sh)", "شمس (Shams — Sun)", "Same teeth and deep bowl as Seen, with 3 dots in a triangle above."],
  ["ص", "Saad", "/sˤ/ (emphatic s)", "صباح (Sabah — Morning)", "Draw a flattened oval loop moving right-to-left, add a tiny tooth, then sweep down into a deep bowl."],
  ["ض", "Daad", "/dˤ/ (emphatic d)", "ضوء (Daw — Light)", "Same loop and bowl as Saad with 1 dot above the oval."],
  ["ط", "Taa (Emphatic)", "/tˤ/ (heavy t)", "طالب (Talib — Student)", "Draw a smooth loop right-to-left along the baseline, then drop a tall vertical stem touching the left side."],
  ["ظ", "Zaa (Emphatic)", "/ðˤ/ (heavy th)", "ظل (Zill — Shadow)", "Same shape as emphatic Taa with 1 dot above the loop."],
  ["ع", "Ayn", "/ʕ/ (deep pharyngeal)", "علم (Ilm — Knowledge)", "Draw a small C-shape above the line connected to a larger sweeping C-belly dipping below the line."],
  ["غ", "Ghayn", "/ɣ/ (French r / gh)", "غيمة (Ghayma — Cloud)", "Same double-curve shape as Ayn with 1 dot on top."],
  ["ف", "Faa", "/f/ (f)", "فصل (Fasl — Class)", "Make a small raised round loop on the right, drop down into a long flat boat along the line + 1 dot above."],
  ["ق", "Qaaf", "/q/ (deep k)", "قلم (Qalam — Pen)", "Make a round loop on the right, sweep into a deep bowl dipping below the line + 2 dots above."],
  ["ك", "Kaaf", "/k/ (k)", "كتاب (Kitab — Book)", "Pull down tall vertical line, turn flat left along baseline with tiny upward tip, place mini-k mark inside."],
  ["ل", "Laam", "/l/ (l)", "لغة (Lugha — Language)", "Draw a tall vertical stem straight down below the line and curve smoothly left like an umbrella handle."],
  ["م", "Meem", "/m/ (m)", "مدرسة (Madrasa — School)", "Draw a small closed circle clockwise on the line, slide left, then drop a crisp vertical tail downward."],
  ["ن", "Noon", "/n/ (n)", "نجم (Najm — Star)", "Draw a deep rounded bowl dipping below the baseline with 1 dot centered inside the top."],
  ["ه", "Haa", "/h/ (soft h)", "هلال (Hilal — Crescent)", "Draw a neat teardrop oval sitting smoothly on the baseline."],
  ["و", "Waaw", "/w/ or /uː/ (w/oo)", "وردة (Warda — Rose)", "Draw a small round loop on the line, then curve smoothly down-left below the baseline like Raa."],
  ["ي", "Yaa", "/j/ or /iː/ (y/ee)", "يد (Yad — Hand)", "Curve smoothly right-to-left like a graceful S-duck dipping below the line and curving up, with 2 dots below."]
].map(([glyph, name, sound, example, howToWrite]) => ({
  letter: glyph,
  glyph,
  upper: glyph,
  name,
  sound,
  speakText: glyph,
  example,
  howToWrite
}));

const HINDI_DEVANAGARI_ALPHABET = [
  ["अ", "a", "/ə/ (short a)", "अनार (Anaar — Pomegranate)", "Draw a 3-shape on the left, connect a short middle bar to a vertical stem on the right, then finish with the top horizontal shirorekha bar."],
  ["आ", "aa", "/aː/ (long aa)", "आम (Aam — Mango)", "Write अ then add a second parallel vertical stem to the right under the same top bar."],
  ["इ", "i", "/ɪ/ (short i)", "इमली (Imli — Tamarind)", "Short vertical tick down, smooth S-curve, small bottom loop tail, topped by horizontal bar."],
  ["ई", "ee", "/iː/ (long ee)", "ईख (Eekh — Sugarcane)", "Write इ and add a graceful C-shaped hook rising above the top horizontal bar."],
  ["उ", "u", "/ʊ/ (short u)", "उल्लू (Ullu — Owl)", "Draw a clean 3-like double curve opening left, topped by the horizontal bar."],
  ["ऊ", "oo", "/uː/ (long oo)", "ऊन (Oon — Wool)", "Write उ and add a curved tail sprouting right from its middle notch."],
  ["ए", "e", "/eː/ (ay)", "एड़ी (Edi — Heel)", "Vertical stroke bending down-right, paired with a curved right tick, topped by horizontal bar."],
  ["ऐ", "ai", "/ɛː/ (ai)", "ऐनक (Ainak — Glasses)", "Write ए and add a diagonal rising matra stroke above the top bar."],
  ["ओ", "o", "/oː/ (oh)", "ओखली (Okhli — Mortar)", "Write आ and add one rising flag stroke above the second vertical stem."],
  ["औ", "au", "/ɔː/ (aw)", "औरत (Aurat — Woman)", "Write आ and add two parallel rising flag strokes above the second vertical stem."],
  ["क", "ka", "/kə/ (k)", "कमल (Kamal — Lotus)", "Draw central vertical stem, round loop on left, open descending curve on right, topped by horizontal bar."],
  ["ख", "kha", "/kʰə/ (kh)", "खरगोश (Khargosh — Rabbit)", "Curved loop left sweeping to bottom, round inner belly connected to right vertical stem + top bar."],
  ["ग", "ga", "/ɡə/ (g)", "गमला (Gamla — Flowerpot)", "Short stem ending in left triangle hook + taller vertical stem on right + top bar."],
  ["च", "cha", "/tʃə/ (ch)", "चम्मच (Chammach — Spoon)", "Short horizontal bar right, curved U-cup underneath joining a vertical stem + top bar."],
  ["ज", "ja", "/dʒə/ (j)", "जहाज (Jahaaz — Ship)", "Lower U-bowl rising to join a short crossbar into the right vertical stem + top bar."],
  ["ट", "ta", "/ʈə/ (retroflex t)", "टमाटर (Tamatar — Tomato)", "Short vertical stem down into a smooth round C-curve opening right + top bar."],
  ["त", "ta", "/t̪ə/ (soft dental t)", "तरबूज (Tarbooj — Watermelon)", "Vertical stem on right with a gentle arch branching left and downward + top bar."],
  ["न", "na", "/nə/ (n)", "नल (Nal — Tap)", "Small round eye on left with horizontal stroke to right vertical stem + top bar."],
  ["प", "pa", "/pə/ (p)", "पतंग (Patang — Kite)", "Draw a crisp U-shape whose right leg extends straight down to baseline + top bar."],
  ["ब", "ba", "/bə/ (b)", "बस (Bus)", "Draw vertical stem on right, round loop on left crossed by a diagonal slash inside + top bar."],
  ["म", "ma", "/mə/ (m)", "मछली (Machhli — Fish)", "Short downstroke forming a left loop, horizontal bar right to full vertical stem + top bar."],
  ["य", "ya", "/jə/ (y)", "यज्ञ (Yagya)", "Curved S-cup joining the right vertical stem + top bar."],
  ["र", "ra", "/rə/ (r)", "रथ (Rath — Chariot)", "Curved right-facing hook sloping down-right to baseline + top bar."],
  ["ल", "la", "/lə/ (l)", "लड्डू (Laddu)", "Vertical stem on right with double-arched wave branching left + top bar."],
  ["स", "sa", "/sə/ (s)", "सूरज (Sooraj — Sun)", "Write र-shape on left joined by a short middle bridge to a right vertical stem + top bar."],
  ["ह", "ha", "/ɦə/ (h)", "हाथी (Haathi — Elephant)", "Short stem down, small S-bend curving cleanly into an open lower arc + top bar."]
].map(([glyph, name, sound, example, howToWrite]) => ({
  letter: glyph,
  glyph,
  upper: glyph,
  name,
  sound,
  speakText: glyph,
  example,
  howToWrite
}));

const CHINESE_PINYIN_HANZI = [
  ["a (ā á ǎ à)", "a", "Pinyin vowel /a/ (4 tones)", "爸 bà (Father)", "Write lowercase a and add tone mark above: 1st flat (ā), 2nd rising (á), 3rd dipping (ǎ), 4th falling (à)."],
  ["o (ō ó ǒ ò)", "o", "Pinyin vowel /o/", "我 wǒ (I / Me)", "Write smooth round o; add tone mark cleanly centered above."],
  ["e (ē é ě è)", "e", "Pinyin vowel /ɤ/ (uh)", "课 kè (Lesson)", "Write lowercase e cleanly with tone mark above."],
  ["i (ī í ǐ ì)", "i", "Pinyin vowel /i/ (ee)", "一 yī (One)", "Write lowercase i (replace dot with tone mark when marked!)."],
  ["u (ū ú ǔ ù)", "u", "Pinyin vowel /u/ (oo)", "书 shū (Book)", "Write lowercase u with tone mark above."],
  ["ü (ǖ ǘ ǚ ǜ)", "ü", "Pinyin rounded /y/", "女 nǚ (Female)", "Write u with two dots above, plus tone mark above the dots."],
  ["b p m f", "Labials", "Pinyin initials /p pʰ m f/", "笔 bǐ (Pen)", "Standard Latin strokes forming core Mandarin syllable initials."],
  ["d t n l", "Alveolars", "Pinyin initials /t tʰ n l/", "大 dà (Big)", "Standard Latin strokes; pronounced cleanly without heavy voicing on d."],
  ["g k h", "Velars", "Pinyin initials /k kʰ x/", "高 gāo (Tall)", "Standard Latin strokes; h is spoken softly from the back of the throat."],
  ["j q x", "Palatals", "Pinyin /tɕ tɕʰ ɕ/", "学 xué (Study)", "Standard Latin strokes; tongue flat near palate (q sounds like soft ch, x like soft sh)."],
  ["zh ch sh r", "Retroflex", "Curled-tongue initials", "中 zhōng (Center)", "Write digraph letters evenly side-by-side; curl tongue tip slightly upward when speaking."],
  ["一", "yī (1)", "Hanzi — Horizontal stroke (Héng)", "一 yī (One)", "Stroke 1: One steady horizontal stroke drawn cleanly from Left to Right."],
  ["二", "èr (2)", "Hanzi — Two horizontals", "二 èr (Two)", "Stroke 1: Short top horizontal (L→R). Stroke 2: Longer bottom horizontal (L→R)."],
  ["三", "sān (3)", "Hanzi — Three horizontals", "三 sān (Three)", "Top medium bar, middle short bar, bottom longest bar — always Top to Bottom, Left to Right."],
  ["人", "rén", "Hanzi — Person", "人 rén (Person)", "Stroke 1: Long curve slanting down-left (piě). Stroke 2: Supporting stroke slanting down-right (nà)."],
  ["大", "dà", "Hanzi — Big", "大学 dàxué (University)", "Stroke 1: Horizontal bar (L→R). Stroke 2: Curve down-left through center. Stroke 3: Slant down-right."],
  ["口", "kǒu", "Hanzi — Mouth", "口 kǒu (Mouth)", "Stroke 1: Left vertical down. Stroke 2: Top horizontal turning straight down right. Stroke 3: Bottom horizontal closing the box."],
  ["日", "rì", "Hanzi — Sun / Day", "日 rì (Sun/Day)", "Left vertical, top-right corner down, inside middle bar (L→R), bottom closing bar."],
  ["学", "xué", "Hanzi — Learn / Study", "学校 xuéxiào (School)", "Three top ticks, wide roof cover, then 子 (child) cleanly underneath — Top to Bottom."]
].map(([letter, name, sound, example, howToWrite]) => ({
  letter,
  glyph: letter.split(" ")[0],
  upper: letter,
  name,
  sound,
  speakText: example.split(" ")[0],
  example,
  howToWrite
}));

const JAPANESE_HIRAGANA = [
  ["あ", "a", "/a/ (ah)", "あさ asa (Morning)", "Stroke 1: Top horizontal bar (L→R). Stroke 2: Gently curved vertical down. Stroke 3: Flowing loop crossing down and curving around right."],
  ["い", "i", "/i/ (ee)", "いえ ie (House)", "Stroke 1: Left curved stroke down with slight upward hook. Stroke 2: Shorter matching stroke on right."],
  ["う", "u", "/ɯ/ (oo)", "うみ umi (Sea)", "Stroke 1: Short diagonal tick at top. Stroke 2: Graceful rounded ear curve sweeping down-left."],
  ["え", "e", "/e/ (eh)", "えんぴつ enpitsu (Pencil)", "Stroke 1: Short top diagonal tick. Stroke 2: Zig-zag right, slant down-left, bounce up and glide down-right."],
  ["お", "o", "/o/ (oh)", "おはよう ohayou (Good morning)", "Stroke 1: Short bar. Stroke 2: Vertical stem looping smoothly around right. Stroke 3: Small dot at upper right."],
  ["か", "ka", "/ka/", "かばん kaban (School bag)", "Horizontal bending down with hook, diagonal crossing down-left, short accent tick on right."],
  ["き", "ki", "/ki/", "き ki (Tree)", "Two parallel short horizontal bars, diagonal stroke crossing down-right, gentle lower curve."],
  ["く", "ku", "/kɯ/", "くに kuni (Country)", "One crisp single stroke slanting down-left to a corner then slanting down-right (<)."],
  ["け", "ke", "/ke/", "けしごむ keshigomu (Eraser)", "Left vertical with tiny hook, right horizontal bar, vertical stroke curving down-left."],
  ["こ", "ko", "/ko/", "こども kodomo (Child)", "Two gentle parallel curves: top curving right with slight turn, bottom curving smoothly upward-right."],
  ["さ", "sa", "/sa/", "さくら sakura (Cherry blossom)", "Top horizontal bar, diagonal stroke down-right, soft lower curve."],
  ["し", "shi", "/ɕi/", "しつもん shitsumon (Question)", "One smooth single stroke pulling straight down then sweeping gently up-right like a fishhook."],
  ["す", "su", "/sɯ/", "すうがく suugaku (Math)", "Horizontal bar across top; vertical down, tiny counter-clockwise loop in center, sweeping down-left."],
  ["せ", "se", "/se/", "せんせい sensei (Teacher)", "Horizontal bar across, short hooked right stroke, left vertical turning smoothly right along bottom."],
  ["そ", "so", "/so/", "そら sora (Sky)", "Single continuous Z-stroke turning into a smooth C-curve at the bottom."],
  ["た", "ta", "/ta/", "たべる taberu (Eat)", "Top bar + long diagonal down-left on left, paired with a small こ (ko) on the right."],
  ["ち", "chi", "/tɕi/", "ちず chizu (Map)", "Short top bar, pull down and round out into a cheerful number-5 belly."],
  ["つ", "tsu", "/tsɯ/", "つくえ tsukue (Desk)", "One sweeping curve gliding right across top and curling down-left."],
  ["て", "te", "/te/", "て te (Hand)", "Horizontal line right curving gracefully back left into a smooth C-arc."],
  ["と", "to", "/to/", "ともだち tomodachi (Friend)", "Short diagonal stem on upper left meeting a smooth curved C-hook on right."],
  ["な", "na", "/na/", "なまえ namae (Name)", "Small cross on upper left, short tick upper right, lower curled ribbon loop."],
  ["に", "ni", "/ni/", "にほん nihon (Japan)", "Left vertical with slight bounce + small こ (ko) beside it on right."],
  ["は", "ha", "/ha/", "はな hana (Flower)", "Left vertical with hook, right horizontal bar, vertical stem finishing in a neat bottom loop."],
  ["ま", "ma", "/ma/", "まど mado (Window)", "Two horizontal bars crossed by a center vertical finishing in a neat lower loop."],
  ["み", "mi", "/mi/", "みず mizu (Water)", "Number-2-like loop across + gentle crossing curve on right."],
  ["や", "ya", "/ja/", "やま yama (Mountain)", "Curved loop right, small top dot, straight diagonal down-right stem."],
  ["ら", "ra", "/ɾa/", "らいねん rainen (Next year)", "Top diagonal tick, then vertical drop curving roundly right like a 5."],
  ["わ", "wa", "/wa/", "わたし watashi (I / Me)", "Vertical stem down, then Z-sweep rising over into a generous right curve."],
  ["ん", "n", "/ɴ/", "ほん hon (Book)", "One fluid cursive h-like stroke slanting down-left, bouncing up and curving gracefully right."]
].map(([glyph, name, sound, example, howToWrite]) => ({
  letter: glyph,
  glyph,
  upper: glyph,
  name,
  sound,
  speakText: glyph,
  example,
  howToWrite
}));

/**
 * Complete Alphabet Catalog organized strictly by ALL 17 Countries on GBS & their Languages
 */
export const COUNTRY_ALPHABETS_CATALOG = [
  {
    countryCode: "GH",
    countryName: "Ghana",
    flag: "🇬🇭",
    languages: [
      { id: "gh_twi", name: "Twi / Akan (Ghana)", script: "Akan Latin Script (22 Letters + Digraphs)", direction: "ltr", speechLocale: "en-GH", note: "Features special vowels Ɛ/ɛ (open e) and Ɔ/ɔ (open o) plus key consonant digraphs ky, gy, tw, dw, ny.", alphabet: TWI_AKAN_ALPHABET },
      { id: "gh_ga", name: "Ga (Gã — Greater Accra)", script: "Ga Script (26 Letters + Digraphs)", direction: "ltr", speechLocale: "en-GH", note: "Includes special letters Ɛ/ɛ, Ŋ/ŋ (eng), and Ɔ/ɔ plus labial-velar gb and kp.", alphabet: GA_ALPHABET },
      { id: "gh_ewe", name: "Ewe (Eʋegbe — Volta)", script: "African Reference Script (30 Letters)", direction: "ltr", speechLocale: "en-GH", note: "Includes unique Ewe characters Ɖ/ɖ, Ɛ/ɛ, Ƒ/ƒ, Ɣ/ɣ, Ŋ/ŋ, Ɔ/ɔ, and Ʋ/ʋ.", alphabet: EWE_ALPHABET },
      { id: "gh_en", name: "English (Ghana / Jolly Phonics)", script: "Latin Alphabet (26 Letters • 42 Sounds)", direction: "ltr", speechLocale: "en-GB", note: "Official medium of education in Ghana; pairs with all 42 Jolly Phonics sounds.", alphabet: ENGLISH_ALPHABET }
    ]
  },
  {
    countryCode: "NG",
    countryName: "Nigeria",
    flag: "🇳🇬",
    languages: [
      { id: "ng_ha", name: "Hausa (Boko Script)", script: "Hausa Latin + Hooked Letters", direction: "ltr", speechLocale: "en-NG", note: "Uses special hooked consonants Ɓ/ɓ, Ɗ/ɗ, Ƙ/ƙ, Ƴ/ƴ and Ts.", alphabet: HAUSA_ALPHABET },
      { id: "ng_yo", name: "Yorùbá", script: "Yorùbá 25-Letter Alphabet", direction: "ltr", speechLocale: "en-NG", note: "Uses underdots Ẹ/ẹ, Ọ/ọ, Ṣ/ṣ and digraph GB/gb with 3 musical tones (High ´, Mid, Low `).", alphabet: YORUBA_ALPHABET },
      { id: "ng_en", name: "English (Nigeria)", script: "Latin Alphabet (26 Letters • 42 Sounds)", direction: "ltr", speechLocale: "en-NG", note: "Standard English alphabet paired with all 42 Jolly Phonics sounds.", alphabet: ENGLISH_ALPHABET }
    ]
  },
  {
    countryCode: "KE",
    countryName: "Kenya",
    flag: "🇰🇪",
    languages: [
      { id: "ke_sw", name: "Kiswahili (Swahili)", script: "Swahili Phonetic Latin (24 Letters + Digraphs)", direction: "ltr", speechLocale: "sw-KE", note: "Consistent phonetic spelling (no Q or X); 5 pure vowels a, e, i, o, u.", alphabet: SWAHILI_ALPHABET },
      { id: "ke_en", name: "English (Kenya)", script: "Latin Alphabet (26 Letters • 42 Sounds)", direction: "ltr", speechLocale: "en-GB", note: "Official classroom English with 42 Jolly Phonics sounds.", alphabet: ENGLISH_ALPHABET }
    ]
  },
  {
    countryCode: "ZA",
    countryName: "South Africa",
    flag: "🇿🇦",
    languages: [
      { id: "za_zu", name: "isiZulu", script: "Zulu Latin Alphabet + Click Consonants", direction: "ltr", speechLocale: "zu-ZA", note: "Letters C, Q, and X represent authentic Zulu dental, palatal, and lateral click sounds.", alphabet: ZULU_ALPHABET },
      { id: "za_en", name: "English (South Africa)", script: "Latin Alphabet (26 Letters • 42 Sounds)", direction: "ltr", speechLocale: "en-ZA", note: "South African classroom English with 42 Jolly Phonics sounds.", alphabet: ENGLISH_ALPHABET }
    ]
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    flag: "🇬🇧",
    languages: [
      { id: "gb_en", name: "British English (UK)", script: "Latin Alphabet (26 Letters • 42 Jolly Phonics)", direction: "ltr", speechLocale: "en-GB", note: "Home of the 42 Jolly Phonics curriculum; use Tab 4 for full 7-group phonics mastery.", alphabet: ENGLISH_ALPHABET }
    ]
  },
  {
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    languages: [
      { id: "us_en", name: "American English (US)", script: "Latin Alphabet (26 Letters • 42 Phonics)", direction: "ltr", speechLocale: "en-US", note: "Standard American English A–Z alphabet and 42 synthetic phonics sounds.", alphabet: ENGLISH_ALPHABET },
      { id: "us_es", name: "Español (US Spanish)", script: "Spanish Alphabet (27 Letters)", direction: "ltr", speechLocale: "es-US", note: "Includes Ñ/ñ alongside the 26 Latin letters.", alphabet: SPANISH_ALPHABET }
    ]
  },
  {
    countryCode: "CA",
    countryName: "Canada",
    flag: "🇨🇦",
    languages: [
      { id: "ca_en", name: "Canadian English", script: "Latin Alphabet (26 Letters)", direction: "ltr", speechLocale: "en-CA", note: "Standard English A–Z and 42 Jolly Phonics sounds.", alphabet: ENGLISH_ALPHABET },
      { id: "ca_fr", name: "Français (Canadian French)", script: "French Alphabet + Accents", direction: "ltr", speechLocale: "fr-CA", note: "26 letters plus French accents é, è, ê, ç, à.", alphabet: FRENCH_ALPHABET }
    ]
  },
  {
    countryCode: "FR",
    countryName: "France",
    flag: "🇫🇷",
    languages: [
      { id: "fr_fr", name: "Français (French)", script: "French Latin + Diacritics", direction: "ltr", speechLocale: "fr-FR", note: "26 letters plus essential accents (é, è, ê, à) and cedilla (ç).", alphabet: FRENCH_ALPHABET }
    ]
  },
  {
    countryCode: "DE",
    countryName: "Germany",
    flag: "🇩🇪",
    languages: [
      { id: "de_de", name: "Deutsch (German)", script: "German Latin + Umlauts & Eszett", direction: "ltr", speechLocale: "de-DE", note: "26 letters plus Ä/ä, Ö/ö, Ü/ü and sharp S (ß).", alphabet: GERMAN_ALPHABET }
    ]
  },
  {
    countryCode: "ES",
    countryName: "Spain",
    flag: "🇪🇸",
    languages: [
      { id: "es_es", name: "Español (Spanish)", script: "Spanish 27-Letter Alphabet", direction: "ltr", speechLocale: "es-ES", note: "27 official letters including Ñ/ñ; crisp phonetic vowel pronunciation.", alphabet: SPANISH_ALPHABET }
    ]
  },
  {
    countryCode: "BR",
    countryName: "Brazil",
    flag: "🇧🇷",
    languages: [
      { id: "br_pt", name: "Português (Brazilian Portuguese)", script: "Portuguese Latin + Nasal Accents", direction: "ltr", speechLocale: "pt-BR", note: "26 letters plus nasal tilde vowels (ã, õ) and ç.", alphabet: PORTUGUESE_ALPHABET }
    ]
  },
  {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    flag: "🇦🇪",
    languages: [
      { id: "ae_ar", name: "العربية (Arabic)", script: "Arabic Abjad (28 Letters • Right-to-Left)", direction: "rtl", speechLocale: "ar-AE", note: "Written Right-to-Left (RTL); all 28 Arabic letters with authentic sounds & stroke direction.", alphabet: ARABIC_ALPHABET },
      { id: "ae_en", name: "English (UAE International)", script: "Latin Alphabet (26 Letters)", direction: "ltr", speechLocale: "en-GB", note: "International school English with 42 Jolly Phonics.", alphabet: ENGLISH_ALPHABET }
    ]
  },
  {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    flag: "🇸🇦",
    languages: [
      { id: "sa_ar", name: "العربية (Arabic — Saudi)", script: "Arabic Abjad (28 Letters • Right-to-Left)", direction: "rtl", speechLocale: "ar-SA", note: "Complete 28-letter Classical & Modern Standard Arabic alphabet (RTL).", alphabet: ARABIC_ALPHABET }
    ]
  },
  {
    countryCode: "IN",
    countryName: "India",
    flag: "🇮🇳",
    languages: [
      { id: "in_hi", name: "हिन्दी (Hindi — Devanagari)", script: "Devanagari Abugida (Vowels + Consonants)", direction: "ltr", speechLocale: "hi-IN", note: "Characters hang neatly from the top horizontal headline bar (Shirorekha).", alphabet: HINDI_DEVANAGARI_ALPHABET },
      { id: "in_en", name: "English (India)", script: "Latin Alphabet (26 Letters • 42 Sounds)", direction: "ltr", speechLocale: "en-IN", note: "CBSE/ICSE English alphabet paired with 42 Jolly Phonics.", alphabet: ENGLISH_ALPHABET }
    ]
  },
  {
    countryCode: "CN",
    countryName: "China",
    flag: "🇨🇳",
    languages: [
      { id: "cn_zh", name: "中文 (Mandarin Pinyin & Hanzi)", script: "Pinyin 4-Tone System + Core Hanzi Strokes", direction: "ltr", speechLocale: "zh-CN", note: "Learn Mandarin Pinyin vowel tones, initials, and foundational Hanzi stroke order (Top→Bottom, Left→Right).", alphabet: CHINESE_PINYIN_HANZI }
    ]
  },
  {
    countryCode: "JP",
    countryName: "Japan",
    flag: "🇯🇵",
    languages: [
      { id: "jp_ja", name: "日本語 (Japanese Hiragana)", script: "Hiragana Phonetic Syllabary", direction: "ltr", speechLocale: "ja-JP", note: "Core Japanese Hiragana characters with romaji reading, pronunciation, and authentic stroke order.", alphabet: JAPANESE_HIRAGANA }
    ]
  },
  {
    countryCode: "INTL",
    countryName: "Global / International",
    flag: "🌍",
    languages: [
      { id: "intl_en", name: "International English (42 Phonics)", script: "Global Latin Alphabet (26 Letters • 42 Sounds)", direction: "ltr", speechLocale: "en-US", note: "Universal English alphabet & 42 Jolly Phonics reference for international learners.", alphabet: ENGLISH_ALPHABET }
    ]
  }
];

/**
 * Active, crystal-clear speech helper for phonics sounds & international alphabet letters.
 */
export function speakPhonicsOrLetter(text, speechLocale = "en-US", rate = 0.96) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(String(text || ""));
    utt.lang = speechLocale || "en-US";
    utt.rate = Math.min(1.08, Math.max(0.85, Number(rate) || 0.96));
    utt.pitch = 1.05; // Clear, bright, active tone (never dull or sleepy)
    utt.volume = 1.0;

    const voices = window.speechSynthesis.getVoices() || [];
    const targetPrefix = String(speechLocale || "en-US").toLowerCase().split("-")[0];
    const exactMatch = voices.find((v) => String(v.lang || "").toLowerCase().replace("_", "-") === String(speechLocale || "").toLowerCase());
    const naturalPrefixMatch = voices.find((v) => String(v.lang || "").toLowerCase().startsWith(targetPrefix) && /natural|neural|online|google|enhanced/i.test(v.name || ""));
    const prefixMatch = voices.find((v) => String(v.lang || "").toLowerCase().startsWith(targetPrefix));
    if (naturalPrefixMatch || exactMatch || prefixMatch) {
      utt.voice = naturalPrefixMatch || exactMatch || prefixMatch;
    }
    window.speechSynthesis.speak(utt);
  } catch { }
}
