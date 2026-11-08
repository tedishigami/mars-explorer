# Mars Explorer — V0

Cœur 3D du futur "Google Earth de Mars" : un globe martien navigable,
avec quelques lieux d'intérêt et une recherche.

## Installer et lancer

```bash
npm install
npm run dev
```

Puis ouvrez l'URL affichée dans le terminal (en général `http://localhost:5173`).

## Ce qui fonctionne dans cette V0

- Globe 3D de Mars : rotation, zoom (molette ou boutons `+`/`−`), déplacement libre.
- Texture de la surface (mosaïque Viking MDIM21, via le service NASA Mars Trek — voir le crédit affiché en bas de l'écran). Si ce service externe est temporairement inaccessible, le globe reste visible dans une couleur rouille de secours.
- 5 lieux martiens (Jezero, Gale, Olympus Mons, Valles Marineris, Elysium Planitia) affichés comme marqueurs cliquables, avec un petit panneau affichant leur nom et leurs coordonnées.
- Recherche par nom, avec suggestions et déplacement automatique de la caméra vers le lieu choisi.
- Interface sombre minimale, calquée sur les apps de cartographie.

## Ce que la prochaine version pourra ajouter

Sans rien casser de l'existant :

- de vraies données NASA (imagerie orbitale haute résolution, topographie, minéralogie, positions des rovers) — à brancher dans `src/services/` et `src/data/`, sans toucher aux composants UI ;
- des points d'intérêt scientifiques enrichis (description, images, type de terrain) — le type `MarsPlace` est fait pour être étendu ;
- une mesure de distance et un calcul d'itinéraire entre deux points ;
- un planificateur de "Marswalk".

## Fichiers importants

- `src/App.tsx` — assemble le globe, la recherche et le panneau d'info ; garde le seul état "lieu sélectionné" de l'app.
- `src/components/MarsGlobe.tsx` — tout le code Cesium (viewer, marqueurs, caméra, clics). C'est le seul fichier qui connaît l'API Cesium.
- `src/services/marsImagery.ts` — l'ellipsoïde de Mars et le fournisseur de tuiles de texture.
- `src/data/marsPlaces.ts` — la liste des lieux (à remplacer plus tard par une vraie source de données).
- `src/components/SearchBar.tsx` / `PlaceInfoPanel.tsx` — UI, ne connaissent jamais Cesium directement.
