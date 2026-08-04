/**
 * premium-exercises.js
 *
 * Full movement & exercise library for the Premium Exercises feature, organized
 * by cycle phase. Each entry includes an image slot, intensity, duration, a full
 * description, step-by-step guidance, benefits, and a gentler modification for
 * flare or high-pain days.
 *
 * IMAGES: `image` is a path under /public that Ali will supply. Until a real file
 * exists at that path, the UI falls back to a themed icon tile (see
 * ImageWithFallback in PremiumExercises.jsx). Suggested convention:
 * /images/exercises/<phase>-<slug>.jpg (e.g. /images/exercises/luteal-yin-yoga.jpg).
 *
 * intensity: 'gentle' | 'moderate' | 'active'
 */

const EXERCISES = {
  menstrual: [
    {
      id: 'menstrual-restorative-yoga',
      title: 'Restorative Yoga for Cramp Relief',
      image: '/images/exercises/menstrual-restorative-yoga.jpg',
      duration: '15-20 min',
      intensity: 'gentle',
      equipment: ['Yoga mat', 'Pillow or bolster', 'Weighted or regular blanket'],
      description: 'A slow, floor-based sequence designed to lower cortisol, release pelvic tension, and give the nervous system permission to rest during the heaviest days of the cycle.',
      steps: [
        "Supported Child's Pose: Kneel with a pillow under your belly and chest, arms relaxed forward or by your sides. Hold for 5–6 minutes, breathing slowly into your lower back.",
        'Legs-Up-The-Wall: Lie on your back with your hips close to a wall and legs extended up it. Hold for 5–8 minutes to encourage pelvic blood flow and reduce swelling.',
        'Savasana with Weighted Blanket: Lie flat with a weighted or folded blanket over the lower abdomen. Let your breath lengthen naturally for 5 minutes.',
      ],
      benefits: ['Lowers cortisol', 'Releases pelvic tension', 'Encourages parasympathetic (rest-and-digest) activation'],
      gentleModification: 'On the heaviest pain days, skip Legs-Up-The-Wall and simply stay in Savasana with the weighted blanket for the full session.',
    },
    {
      id: 'menstrual-heat-breathwork',
      title: 'Heat & Breath Cramp Relief',
      image: '/images/exercises/menstrual-heat-breathwork.jpg',
      duration: '10 min',
      intensity: 'gentle',
      equipment: ['Heating pad or hot water bottle'],
      description: 'A simple combination of heat application and slow diaphragmatic breathing to help ease cramping and calm the nervous system when energy is at its lowest.',
      steps: [
        'Lie down comfortably and place a heating pad on your lower abdomen or lower back.',
        'Place one hand on your belly and one on your chest. Inhale slowly through the nose for a count of 4, letting the belly rise.',
        'Exhale slowly through the mouth for a count of 6–8, letting the belly fall.',
        'Continue for 8–10 rounds, keeping the heat in place throughout.',
      ],
      benefits: ['Relaxes uterine muscle', 'Increases local blood flow', 'Activates the vagus nerve to reduce pain signaling'],
      gentleModification: 'Can be done seated in a reclined chair if lying down is uncomfortable.',
    },
    {
      id: 'menstrual-gentle-walk',
      title: 'Gentle 10-Minute Walk',
      image: '/images/exercises/menstrual-gentle-walk.jpg',
      duration: '10 min',
      intensity: 'gentle',
      equipment: ['Comfortable shoes'],
      description: 'Light movement, even in small doses, can ease cramping by increasing circulation without demanding much from a body that\u2019s already working hard.',
      steps: [
        'Step outside or walk indoors at a slow, comfortable pace.',
        'Focus on relaxed shoulders and easy breathing rather than pace or distance.',
        'Stop and rest at any point if cramping increases.',
      ],
      benefits: ['Increases circulation', 'Eases bloating', 'Gentle mood boost from light activity and daylight'],
      gentleModification: 'Skip entirely on flare days — rest is just as valid a choice during menstruation.',
    },
  ],

  follicular: [
    {
      id: 'follicular-strength-training',
      title: 'Strength Training (Moderate)',
      image: '/images/exercises/follicular-strength-training.jpg',
      duration: '20-30 min',
      intensity: 'moderate',
      equipment: ['Dumbbells or resistance bands (optional)', 'Mat'],
      description: 'Rising estrogen in the follicular phase supports muscle repair and strength gains, making this a great window to build or maintain strength training.',
      steps: [
        'Warm up with 3–5 minutes of light cardio or dynamic stretching.',
        'Perform 2–3 sets of 8–12 reps each of: bodyweight squats, walking lunges, push-ups (or knee push-ups), and glute bridges.',
        'Rest 60–90 seconds between sets.',
        'Cool down with 5 minutes of gentle stretching, focusing on hips and shoulders.',
      ],
      benefits: ['Builds muscle and bone density', 'Supports metabolism', 'Takes advantage of rising estrogen for recovery'],
      gentleModification: 'Reduce to bodyweight-only exercises and 1–2 sets if energy is lower than expected.',
    },
    {
      id: 'follicular-morning-walk-sunlight',
      title: 'Energizing Morning Walk + Sunlight',
      image: '/images/exercises/follicular-morning-walk-sunlight.jpg',
      duration: '20 min',
      intensity: 'gentle',
      equipment: ['Comfortable shoes'],
      description: 'A brisk outdoor walk within 30 minutes of waking pairs rising energy with morning light exposure, which helps anchor circadian rhythm and mood.',
      steps: [
        'Head outside within 30 minutes of waking, if possible.',
        'Walk at a brisk, comfortable pace for 20 minutes, letting sunlight reach your face and arms (sunscreen is fine).',
        'Breathe deeply and notice your surroundings rather than checking your phone.',
      ],
      benefits: ['Anchors circadian rhythm', 'Boosts mood and energy', 'Supports healthy cortisol rhythm'],
      gentleModification: 'On cooler or rainy days, sit by a bright window for 10–15 minutes instead.',
    },
    {
      id: 'follicular-gut-ritual-movement',
      title: 'Gut-Nourishing Morning Ritual',
      image: '/images/exercises/follicular-gut-ritual-movement.jpg',
      duration: '5 min',
      intensity: 'gentle',
      equipment: ['Warm water', 'Lemon'],
      description: 'A short morning ritual pairing hydration and gentle movement to support digestion as energy and appetite begin to rise.',
      steps: [
        'Start the day with a glass of warm water with lemon.',
        'Follow with 5 slow standing side bends and torso twists to gently wake up digestion.',
        'Pair with a probiotic-rich food (sauerkraut, kimchi, or kefir if tolerated) at breakfast.',
      ],
      benefits: ['Supports digestion', 'Gentle spinal mobility', 'Sets a calm tone for the day'],
      gentleModification: 'Movement can be done seated if standing is uncomfortable.',
    },
  ],

  ovulatory: [
    {
      id: 'ovulatory-moderate-cardio',
      title: 'Moderate Cardio (Listen to Your Body)',
      image: '/images/exercises/ovulatory-moderate-cardio.jpg',
      duration: '20-30 min',
      intensity: 'active',
      equipment: ['Comfortable shoes', 'Bike or pool, optional'],
      description: 'Energy and estrogen typically peak around ovulation, making this a good window for cardio — but ovulation pain (mittelschmerz) is common, so this is designed to flex with how you feel.',
      steps: [
        'Choose brisk walking, cycling, swimming, or light jogging.',
        'Warm up for 3–5 minutes at an easy pace.',
        'Sustain a moderate effort — you should be able to hold a conversation — for 20–30 minutes.',
        'Cool down with 3–5 minutes of easy movement and light stretching.',
      ],
      benefits: ['Cardiovascular conditioning', 'Endorphin release', 'Supports healthy circulation during peak estrogen'],
      gentleModification: 'If ovulation-side pain is present, switch to swimming or a slow walk and shorten to 10–15 minutes.',
    },
    {
      id: 'ovulatory-hip-opening-flow',
      title: 'Hip-Opening Yoga Flow',
      image: '/images/exercises/ovulatory-hip-opening-flow.jpg',
      duration: '15-20 min',
      intensity: 'moderate',
      equipment: ['Yoga mat', 'Pillow or block (optional)'],
      description: 'A gentle flow to release tension around the hips and pelvis, useful if ovulation brings one-sided pinching or aching pain.',
      steps: [
        'Move through 3–4 rounds of gentle sun salutations to warm the body.',
        "Lizard Pose: Step one foot forward outside the hands, lower the back knee, and hold for 3–5 breaths each side.",
        "Supported Pigeon Pose: Place a pillow under the front hip for support and hold for 3–5 breaths each side.",
        'Finish with slow hip circles on hands and knees, 5 in each direction.',
      ],
      benefits: ['Releases hip and pelvic tension', 'Improves mobility', 'Can ease one-sided ovulation pain'],
      gentleModification: 'Skip Pigeon Pose entirely and stay with gentle hip circles if there is sharp or one-sided pain.',
    },
    {
      id: 'ovulatory-hydration-electrolyte-walk',
      title: 'Hydration-Focused Recovery Walk',
      image: '/images/exercises/ovulatory-hydration-electrolyte-walk.jpg',
      duration: 'Throughout the day',
      intensity: 'gentle',
      equipment: ['Water bottle', 'Electrolytes or a pinch of sea salt'],
      description: 'Ovulation increases fluid needs. This pairs steady hydration with light movement breaks spread through the day rather than one long session.',
      steps: [
        'Aim for 6–8 glasses of water across the day, plus herbal teas like nettle, raspberry leaf, or peppermint.',
        'Add a pinch of sea salt to one glass of water for electrolyte support.',
        'Take three 5-minute walking breaks through the day — after meals works well.',
      ],
      benefits: ['Supports hydration status', 'Breaks up sedentary time', 'Gentle, sustainable movement'],
      gentleModification: 'Replace walking breaks with standing stretches if mobility is limited that day.',
    },
  ],

  luteal: [
    {
      id: 'luteal-yin-yoga',
      title: 'Gentle Yin Yoga or Restorative Stretching',
      image: '/images/exercises/luteal-yin-yoga.jpg',
      duration: '20-30 min',
      intensity: 'gentle',
      equipment: ['Yoga mat', 'Pillow or bolster'],
      description: 'Long-held floor poses that calm the nervous system as progesterone rises and PMS symptoms can build — good for both body and mood.',
      steps: [
        "Butterfly Pose: Sit with the soles of the feet together, knees relaxed out to the sides. Hold for 2–3 minutes, breathing slowly.",
        "Child's Pose: Sink hips back toward the heels with arms extended forward. Hold for 2–3 minutes.",
        'Legs-Up-The-Wall: Hold for 3–5 minutes to ease lower body tension and support circulation.',
        'Gentle Spinal Twist: Lying on your back, drop both knees to one side, arms out in a T. Hold 2–3 minutes each side.',
      ],
      benefits: ['Calms the nervous system', 'Eases PMS-related tension', 'Supports better sleep'],
      gentleModification: 'Use pillows generously under knees and hips in every pose — the goal is complete relaxation, not a deep stretch.',
    },
    {
      id: 'luteal-evening-wind-down',
      title: 'Evening Wind-Down Protocol',
      image: '/images/exercises/luteal-evening-wind-down.jpg',
      duration: '1-2 hours before bed',
      intensity: 'gentle',
      equipment: ['Journal (optional)', 'Chamomile or lavender tea'],
      description: 'A structured wind-down routine to support the sleep quality that\u2019s often disrupted by rising progesterone and PMS symptoms in the luteal phase.',
      steps: [
        'Dim household lights around 8 PM to support melatonin production.',
        'Avoid screens after 9 PM, or use blue-light filtering if unavoidable.',
        'Make a warm cup of chamomile or lavender tea.',
        'Spend 5 minutes journaling or doing slow, gentle breathing before bed.',
      ],
      benefits: ['Supports melatonin production', 'Reduces evening anxiety and PMS irritability', 'Improves sleep onset'],
      gentleModification: 'If journaling feels like too much, simply sit quietly with the tea and focus on breath for a few minutes instead.',
    },
    {
      id: 'luteal-comfort-first-movement',
      title: 'Comfort-First Movement: Walking or Swimming',
      image: '/images/exercises/luteal-comfort-first-movement.jpg',
      duration: '20 min',
      intensity: 'gentle',
      equipment: ['Comfortable shoes, or swimwear'],
      description: 'Light, low-impact movement that supports mood and bloating without adding stress to a body that may already be sensitive to pelvic pressure.',
      steps: [
        'Choose a 20-minute walk at a comfortable pace, or gentle swimming in warm water.',
        'Keep effort easy and conversational throughout.',
        'Stop immediately if you notice any increase in pelvic pressure or pain.',
      ],
      benefits: ['Eases bloating', 'Mood support without overexertion', 'Low-impact on sensitive days'],
      gentleModification: 'Replace with 10 minutes of seated gentle stretching if walking or swimming isn\u2019t accessible that day.',
    },
  ],
}

export default EXERCISES
