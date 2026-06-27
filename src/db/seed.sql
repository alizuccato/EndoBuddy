-- EndoBuddy Seed Data
-- Reference data for symptoms, pain locations, medications, and cycle phases

-- Cycle Phases (if not already inserted by 001_initial_schema.sql)
INSERT OR IGNORE INTO cycle_phases (name, typical_day_range, description) VALUES
    ('menstrual',   '1-5',   'Period bleeding — low estrogen and progesterone'),
    ('follicular',  '6-14',  'Follicles develop — estrogen rises'),
    ('ovulation',   '14',    'Egg released — estrogen peak'),
    ('luteal',      '15-28', 'Progesterone rises — PMS symptoms common');

-- Symptoms
INSERT OR IGNORE INTO symptoms (name, category, icon) VALUES
    ('Bloating',        'digestive',    '🫃'),
    ('Cramping',        'pain',         '⚡'),
    ('Fatigue',         'general',      '😴'),
    ('Nausea',          'digestive',    '🤢'),
    ('Headache',        'pain',         '🤕'),
    ('Back pain',       'pain',         '🔙'),
    ('Breast tenderness', 'pain',       '🎯'),
    ('Mood swings',     'emotional',    '🎢'),
    ('Anxiety',         'emotional',    '😰'),
    ('Depression',      'emotional',    '😢'),
    ('Insomnia',        'general',      '🌙'),
    ('Brain fog',       'neurological', '🌫️'),
    ('Dizziness',       'neurological', '💫'),
    ('Joint pain',      'pain',         '🦴'),
    ('Muscle aches',    'pain',         '💪'),
    ('Acne',            'general',      '🔴'),
    ('Constipation',    'digestive',    '🚫'),
    ('Diarrhea',        'digestive',    '💧'),
    ('Urinary urgency', 'urinary',      '🚽'),
    ('Painful urination', 'urinary',    '🔥'),
    ('Hot flashes',     'general',      '🌡️'),
    ('Night sweats',    'general',      '💦'),
    ('Weight gain',     'general',      '⚖️'),
    ('Hair thinning',   'general',      '💇'),
    ('Appetite changes', 'digestive',   '🍽️');

-- Pain Locations
INSERT OR IGNORE INTO pain_locations (name, body_region) VALUES
    ('Lower abdomen',       'abdomen'),
    ('Upper abdomen',       'abdomen'),
    ('Lower back',          'back'),
    ('Upper back',          'back'),
    ('Pelvis',              'pelvis'),
    ('Legs',                'legs'),
    ('Hips',                'pelvis'),
    ('Head',                'head'),
    ('Chest',               'chest'),
    ('Shoulders',           'back'),
    ('Neck',                'back'),
    ('Ovaries',             'pelvis'),
    ('Rectum',              'pelvis');

-- Medications
INSERT OR IGNORE INTO medications (name, type, category) VALUES
    ('Ibuprofen',           'OTC',          'pain_relief'),
    ('Naproxen',            'OTC',          'pain_relief'),
    ('Tylenol',             'OTC',          'pain_relief'),
    ('Birth Control Pill',  'prescription', 'hormonal'),
    ('GnRH Agonist',        'prescription', 'hormonal'),
    ('Orilissa',            'prescription', 'hormonal'),
    ('Lupron Depot',        'prescription', 'hormonal'),
    ('Progestin Therapy',   'prescription', 'hormonal'),
    ('Magnesium',           'supplement',   'supplement'),
    ('Vitamin B6',          'supplement',   'supplement'),
    ('Vitamin D',           'supplement',   'supplement'),
    ('Omega-3',            'supplement',   'supplement'),
    ('Turmeric',            'herbal',       'anti-inflammatory'),
    ('Ginger',              'herbal',       'anti-inflammatory'),
    ('CBD Oil',             'herbal',       'pain_relief'),
    ('Heat Pack',           'OTC',          'pain_relief'),
    ('TENS Unit',           'OTC',          'pain_relief'),
    ('Acupuncture',         'herbal',       'pain_relief'),
    ('Birth Control Patch', 'prescription', 'hormonal'),
    ('IUD (Hormonal)',      'prescription', 'hormonal');