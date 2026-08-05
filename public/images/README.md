# Image assets for Premium recipes & exercises

Drop your licensed photos here using this naming convention so they wire up
automatically — no code changes needed:

- Recipes:   /public/images/recipes/<phase>-<slug>.jpg
- Exercises: /public/images/exercises/<phase>-<slug>.jpg

The exact filenames expected are listed as the `image` field of each entry in:
- src/data/premium-recipes.js
- src/data/premium-exercises.js

Recommended size: 1200x800px (3:2), landscape, JPG, **under 300KB each** for
fast mobile loading. (Earlier PNGs in this project were running 1.7-2.7MB
each — 6-9x over budget — which is why images weren't reliably loading in
production. Re-exporting as compressed JPEG at this size fixed it.)

Until a file exists at a given path, the app automatically shows a soft
themed icon tile instead of a broken image — so it's safe to ship this
feature before every photo is in place, and add them incrementally.
