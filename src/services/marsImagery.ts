import * as Cesium from "cesium";

/**
 * L'ellipsoïde de Mars (rayons en mètres).
 *
 * Mars n'est pas une sphère parfaite : son rayon équatorial est
 * légèrement plus grand que son rayon polaire. Ces valeurs viennent
 * du modèle de référence utilisé par l'USGS pour cartographier Mars
 * (rayon équatorial 3396.19 km, rayon polaire 3376.2 km).
 *
 * Cesium est conçu pour la Terre par défaut : on passe cet ellipsoïde
 * explicitement partout où une position est calculée (viewer, globe,
 * projection, marqueurs) pour que la géométrie soit cohérente.
 */
export const MARS_ELLIPSOID = new Cesium.Ellipsoid(
  3_396_190,
  3_396_190,
  3_376_200,
);

/**
 * Provenance de la texture de Mars affichée sur le globe.
 *
 * Il s'agit de la mosaïque colorisée "Viking MDIM21", produite par
 * l'USGS Astrogeology Science Center à partir d'images de la mission
 * Viking, et distribuée via le service NASA Mars Trek (WMTS).
 * Ce n'est pas de l'imagerie orbitale récente ni haute résolution :
 * c'est une texture globale, suffisante pour un globe V0.
 *
 * Source : NASA Mars Trek / USGS Astrogeology (api.nasa.gov/mars-wmts).
 */
export const MARS_IMAGERY_CREDIT =
  "Texture Mars : USGS Astrogeology / NASA Mars Trek — mosaïque Viking MDIM21";

/**
 * Crée le fournisseur de tuiles pour la texture de la surface de Mars.
 *
 * Si ce service NASA devient indisponible (réseau, CORS, changement
 * d'API), Cesium affichera simplement des tuiles manquantes : le
 * globe reste visible grâce à la couleur de base définie sur
 * `Globe.baseColor` dans MarsGlobe.tsx, il n'y a pas de plantage.
 */
export function createMarsImageryProvider(): Cesium.WebMapTileServiceImageryProvider {
  return new Cesium.WebMapTileServiceImageryProvider({
    url:
      "https://api.nasa.gov/mars-wmts/catalog/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/" +
      "default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg",
    layer: "Mars_Viking_MDIM21_ClrMosaic_global_232m",
    style: "default",
    format: "image/jpg",
    tileMatrixSetID: "default028mm",
    maximumLevel: 9,
    credit: new Cesium.Credit(MARS_IMAGERY_CREDIT),
    tilingScheme: new Cesium.GeographicTilingScheme({ ellipsoid: MARS_ELLIPSOID }),
  });
}
