import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

const WIDTH = 1440;
const HEIGHT = 720;
const PIXEL = 0.25;
const NODATA = -32768;
const TILE = 65;
const MARS = new Cesium.Ellipsoid(3_396_190, 3_396_190, 3_376_200);
Cesium.Ellipsoid.default = MARS;

async function main() {
  const container = document.getElementById("terrain-test");
  if (!container) throw new Error("Conteneur introuvable.");
  const response = await fetch("/terrain-test-data/mola.raw");
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== WIDTH * HEIGHT * 2) throw new Error("Taille MOLA incorrecte");
  const data = new DataView(buffer);

  const at = (row: number, col: number): number => {
    const c = ((col % WIDTH) + WIDTH) % WIDTH;
    const r = Math.max(0, Math.min(HEIGHT - 1, row));
    return data.getInt16((r * WIDTH + c) * 2, true);
  };

  const sample = (lon: number, lat: number): number => {
    const col = (Cesium.Math.toDegrees(lon) + 180) / PIXEL - 0.5;
    const row = (90 - Cesium.Math.toDegrees(lat)) / PIXEL - 0.5;
    const c0 = Math.floor(col);
    const r0 = Math.floor(row);
    const dx = col - c0;
    const dy = row - r0;
    const s = [at(r0, c0), at(r0, c0 + 1), at(r0 + 1, c0), at(r0 + 1, c0 + 1)];
    if (s.some((h) => h === NODATA)) return s.find((h) => h !== NODATA) ?? 0;
    return (s[0] * (1 - dx) + s[1] * dx) * (1 - dy) + (s[2] * (1 - dx) + s[3] * dx) * dy;
  };

  const scheme = new Cesium.GeographicTilingScheme({ ellipsoid: MARS });
  const provider = new Cesium.CustomHeightmapTerrainProvider({
    tilingScheme: scheme,
    ellipsoid: MARS,
    width: TILE,
    height: TILE,
    callback: (x, y, level) => {
      const rect = scheme.tileXYToRectangle(x, y, level);
      const h = new Float32Array(TILE * TILE);
      for (let j = 0; j < TILE; j++) {
        const lat = rect.north - (j / (TILE - 1)) * (rect.north - rect.south);
        for (let i = 0; i < TILE; i++) {
          const lon = rect.west + (i / (TILE - 1)) * (rect.east - rect.west);
          h[j * TILE + i] = sample(lon, lat);
        }
      }
      return h;
    },
  });

  const viewer = new Cesium.Viewer(container, {
    globe: false,
    baseLayer: false,
    baseLayerPicker: false,
    animation: false,
    timeline: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    geocoder: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    mapProjection: new Cesium.GeographicProjection(MARS),
  });
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#05060a");
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(0, 0, 15_000_000, MARS),
  });

  const stand = viewer.entities.add({
    position: Cesium.Cartesian3.ZERO,
    ellipsoid: { radii: MARS.radii, material: Cesium.Color.fromCssColorString("#6b5a4a") },
  });
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(-133.8, 18.65, 0, MARS),
    point: {
      pixelSize: 10,
      color: Cesium.Color.fromCssColorString("#e8734a"),
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });

  const box = document.createElement("div");
  box.style.cssText = "position:fixed;top:8px;left:8px;z-index:10;color:#fff;font:14px sans-serif";
  const btn = document.createElement("button");
  btn.style.cssText = "padding:10px 14px;font-size:16px";
  const info = document.createElement("div");
  box.append(btn, info);
  document.body.appendChild(box);

  const C = Cesium.Color;
  let globe: Cesium.Globe | null = null;
  let relief = false;

  const apply = () => {
    if (relief && !globe) {
      globe = new Cesium.Globe(MARS);
      globe.terrainProvider = provider;
      globe.baseColor = C.fromCssColorString("#9a8069");
      globe.enableLighting = false;
      globe.material = Cesium.createElevationBandMaterial({
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
      viewer.scene.globe = globe;
    }
    if (globe) globe.show = relief;
    stand.show = !relief;
    btn.textContent = relief ? "Mode Relief (toucher : Globe)" : "Mode Globe (toucher : Relief)";
    info.textContent = "Rayons : " + (viewer.scene.globe?.ellipsoid?.radii?.toString() ?? "aucun globe");
  };
  btn.onclick = () => {
    relief = !relief;
    apply();
  };
  apply();
}

main().catch((error) => {
  console.error("Échec du prototype :", error);
  document.body.textContent = "Erreur : " + String(error);
  document.body.style.color = "white";
});
