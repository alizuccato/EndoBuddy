# Image assets for Premium recipes & exercises

Drop your licensed photos here using this naming convention so they wire up
automatically — no code changes needed:

- Recipes:   /public/images/recipes/<phase>-<slug>.png
- Exercises: /public/images/exercises/<phase>-<slug>.png

The exact filenames expected are listed as the `image` field of each entry in:
- src/data/premium-recipes.js
- src/data/premium-exercises.js

Recommended size: ~800x600px (4:3) or 1200x800px (3:2), landscape, JPG or WEBP,
under ~300KB each for fast mobile loading.

Until a file exists at a given path, the app automatically shows a soft
themed icon tile instead of a broken image — so it's safe to ship this
feature before every photo is in place, and add them incrementally.
