import type { MarsPlace } from "../types/place";

/**
 * Une poignée de lieux martiens connus pour la V0.
 *
 * Coordonnées approximatives (degrés), issues de sources publiques de
 * cartographie planétaire (USGS Astrogeology / NASA). Suffisant pour
 * positionner un marqueur ; une future version pourra remplacer ce
 * fichier statique par des données NASA plus précises (PDS, Mars Trek
 * feature catalog, etc.) sans changer la forme des données consommées
 * par l'UI.
 */
export const MARS_PLACES: MarsPlace[] = [
  {
    id: "jezero-crater",
    name: "Jezero Crater",
    latitude: 18.4,
    longitude: 77.5,
  },
  {
    id: "gale-crater",
    name: "Gale Crater",
    latitude: -5.4,
    longitude: 137.8,
  },
  {
    id: "olympus-mons",
    name: "Olympus Mons",
    latitude: 18.65,
    longitude: -133.8,
  },
  {
    id: "valles-marineris",
    name: "Valles Marineris",
    latitude: -13.9,
    longitude: -59.2,
  },
  {
    id: "elysium-planitia",
    name: "Elysium Planitia",
    latitude: 3.0,
    longitude: 154.7,
  },
  {
    id: "utopia-planitia",
    name: "Utopia Planitia",
    latitude: 49.67,
    longitude: 118.0,
  },
  {
    id: "gusev-crater",
    name: "Gusev Crater",
    latitude: -14.53,
    longitude: 175.52,
  },
  {
    id: "hellas-planitia",
    name: "Hellas Planitia",
    latitude: -42.66,
    longitude: 70.0,
  },
  {
    id: "noctis-labyrinthus",
    name: "Noctis Labyrinthus",
    latitude: -6.92,
    longitude: 257.8,
  },
  {
    id: "ascraeus-mons",
    name: "Ascraeus Mons",
    latitude: 11.76,
    longitude: 255.5,
  },
  {
    id: "eberswalde-crater",
    name: "Eberswalde Crater",
    latitude: -23.98,
    longitude: 326.7,
  },
  {
    id: "mawrth-vallis",
    name: "Mawrth Vallis",
    latitude: 22.36,
    longitude: 343.5,
  },
  {
    id: "chryse-planitia",
    name: "Chryse Planitia",
    latitude: 28.43,
    longitude: 319.69,
  },
  {
    id: "arcadia-planitia",
    name: "Arcadia Planitia",
    latitude: 46.66,
    longitude: 192.0,
  },
  {
    id: "arsia-mons",
    name: "Arsia Mons",
    latitude: -8.3,
    longitude: 238.9,
  },
];
