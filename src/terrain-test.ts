import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const WIDTH = 1440;
const HEIGHT = 720;
const PIXEL_SIZE = 0.25;
const NODATA = -32768;
const TILE_SIZE = 65;

const MARS_ELLIPSOID = new Cesium.Ellipsoid(
  3396000,
  3396000,
  3376200,
);

Cesium.Ellipsoid.default = MARS_ELLIPSOID;

let callCount = 0;
async function main() {
  const container = document.getElementById("terrain-test");
  if (!container) throw new Error("Conteneur du test introuvable.");

  container.textContent = "Chargement des données MOLA…";

  const response = await fetch("/terrain-test-data/mola.raw");
  if (!response.ok) {
    throw new Error(`Impossible de charger MOLA : HTTP ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  if (buffer.byteLength !== WIDTH * HEIGHT * 2) {
    throw new Error(`Taille MOLA incorrecte : ${buffer.byteLength} octets`);
  }

  const data = new DataView(buffer);

  function getElevation(row: number, col: number): number {
    const wrappedCol = ((col % WIDTH) + WIDTH) % WIDTH;
    const clampedRow = Math.max(0, Math.min(HEIGHT - 1, row));
    const index = (clampedRow * WIDTH + wrappedCol) * 2;
    return data.getInt16(index, true);
  }

  function sampleElevation(longitude: number, latitude: number): number {
    const lon = Cesium.Math.toDegrees(longitude);
    const lat = Cesium.Math.toDegrees(latitude);

    // Les valeurs MOLA représentent des pixels de 0,25°.
    const col = (lon + 180) / PIXEL_SIZE - 0.5;
    const row = (90 - lat) / PIXEL_SIZE - 0.5;

    const col0 = Math.floor(col);
    const row0 = Math.floor(row);
    const dx = col - col0;
    const dy = row - row0;

    const h00 = getElevation(row0, col0);
    const h10 = getElevation(row0, col0 + 1);
    const h01 = getElevation(row0 + 1, col0);
    const h11 = getElevation(row0 + 1, col0 + 1);

    const samples = [h00, h10, h01, h11];

    if (samples.some((h) => h === NODATA)) {
      return samples.find((h) => h !== NODATA) ?? 0;
    }

    const top = h00 * (1 - dx) + h10 * dx;
    const bottom = h01 * (1 - dx) + h11 * dx;
    return top * (1 - dy) + bottom * dy;
  }

  const tilingScheme = new Cesium.GeographicTilingScheme({
    ellipsoid: MARS_ELLIPSOID,
  });

  const terrainProvider = new Cesium.CustomHeightmapTerrainProvider({
    tilingScheme,
    ellipsoid: MARS_ELLIPSOID,
    width: TILE_SIZE,
    height: TILE_SIZE,
    callback: (x, y, level) => {
      const rectangle = tilingScheme.tileXYToRectangle(x, y, level);
      const heights = new Float32Array(TILE_SIZE * TILE_SIZE);
      callCount++;

      for (let j = 0; j < TILE_SIZE; j++) {
        const latitude =
          rectangle.north -
          (j / (TILE_SIZE - 1)) * (rectangle.north - rectangle.south);

        for (let i = 0; i < TILE_SIZE; i++) {
          const longitude =
            rectangle.west +
            (i / (TILE_SIZE - 1)) * (rectangle.east - rectangle.west);

          heights[j * TILE_SIZE + i] = sampleElevation(
            longitude,
            latitude,
          );
        }
      }

      return heights;
    },
  });

  container.textContent = "";

  const viewer = new Cesium.Viewer(container, {
    terrainProvider,
    baseLayer: false,
    baseLayerPicker: false,
    animation: false,
    timeline: false,
    homeButton: true,
    sceneModePicker: false,
    navigationHelpButton: false,
    geocoder: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    mapProjection: new Cesium.GeographicProjection(MARS_ELLIPSOID),
  });

  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#05060a");
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#9a8069");
  viewer.scene.globe.enableLighting = false;

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      0,
      0,
      15000000,
      MARS_ELLIPSOID,
    ),
  });

  const dbg = document.createElement("div");
  dbg.style.cssText = "position:fixed;top:8px;left:8px;z-index:10;color:#fff;background:#000a;padding:8px;font:12px monospace;white-space:pre";
  document.body.appendChild(dbg);
  const olympus = sampleElevation(Cesium.Math.toRadians(-133.8), Cesium.Math.toRadians(18.65));
  setInterval(() => {
    const g = viewer.scene.globe;
    dbg.textContent = [
      "Olympus : " + olympus.toFixed(0) + " m",
      "Fournisseur : " + viewer.terrainProvider?.constructor?.name,
      "Rayon globe : " + g.ellipsoid?.radii?.toString(),
      "Appels callback : " + callCount,
    ].join("\n");
  }, 500);
  const C = Cesium.Color;
  viewer.scene.globe.material = Cesium.createElevationBandMaterial({
    scene: viewer.scene,
    layers: [{
      extendDownwards: true,
      extendUpwards: true,
      entries: [
        { height: -8000, color: new C(0.05, 0.15, 0.6, 1) },
        { height: -4000, color: new C(0.1, 0.5, 0.8, 1) },
        { height: 0, color: new C(0.2, 0.7, 0.3, 1) },
        { height: 6000, color: new C(0.9, 0.8, 0.2, 1) },
        { height: 12000, color: new C(0.8, 0.3, 0.1, 1) },
        { height: 21000, color: new C(1, 1, 1, 1) },
      ],
    }],
  });
  viewer.scene.verticalExaggeration = 15;
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(-134, 2, 1500000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-50),
      roll: 0,
    },
  });
  console.log("Test MOLA prêt.");
  console.log("Altitude à Olympus Mons :", sampleElevation(
    Cesium.Math.toRadians(-133.8),
    Cesium.Math.toRadians(18.65),
  ), "m");
}

main().catch((error) => {
  console.error("Échec du test de terrain MOLA :", error);
  const container = document.getElementById("terrain-test");
  if (container) {
    container.textContent =
      "Erreur pendant le chargement du terrain. Consulte la console du navigateur.";
    container.style.color = "white";
    container.style.padding = "20px";
  }
});
