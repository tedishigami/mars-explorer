import * as Cesium from "cesium";

const WIDTH = 1440;
const HEIGHT = 720;
const PIXEL = 0.25;
const NODATA = -32768;
const TILE = 65;

/** Raster MOLA 4 pixels/degré (Int16 little-endian, 1440×720). */
export const MOLA_TERRAIN_URL = import.meta.env.BASE_URL + "terrain-test-data/mola.raw";

/** Fournisseur de relief martien à partir du raster MOLA. */
export async function createMolaTerrainProvider(
  ellipsoid: Cesium.Ellipsoid,
): Promise<Cesium.CustomHeightmapTerrainProvider> {
  const response = await fetch(MOLA_TERRAIN_URL);
  if (!response.ok) {
    throw new Error("Impossible de charger MOLA : HTTP " + response.status);
  }
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength !== WIDTH * HEIGHT * 2) {
    throw new Error("Taille MOLA incorrecte : " + buffer.byteLength);
  }
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

  const scheme = new Cesium.GeographicTilingScheme({ ellipsoid });
  return new Cesium.CustomHeightmapTerrainProvider({
    tilingScheme: scheme,
    ellipsoid,
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
}

/** Exagération verticale du relief (×1 = taille réelle, quasi invisible). */
export const RELIEF_EXAGGERATION = 15;

/** Paliers de couleur du relief : altitude (m) et couleur RGB (0 à 255). */
export const MOLA_RELIEF_STOPS: ReadonlyArray<{
  height: number;
  rgb: [number, number, number];
}> = [
  { height: -8000, rgb: [13, 38, 153] },
  { height: -4000, rgb: [26, 128, 204] },
  { height: 0, rgb: [51, 179, 77] },
  { height: 6000, rgb: [230, 204, 51] },
  { height: 12000, rgb: [204, 77, 26] },
  { height: 21000, rgb: [255, 255, 255] },
];

/** Matériau de coloration du globe par altitude. */
export function createMolaReliefMaterial(scene: Cesium.Scene): Cesium.Material {
  return Cesium.createElevationBandMaterial({
    scene,
    layers: [
      {
        extendDownwards: true,
        extendUpwards: true,
        entries: MOLA_RELIEF_STOPS.map((stop) => ({
          height: stop.height,
          color: Cesium.Color.fromBytes(stop.rgb[0], stop.rgb[1], stop.rgb[2], 255),
        })),
      },
    ],
  });
}
