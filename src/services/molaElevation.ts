const WIDTH = 1440;
const HEIGHT = 718;

const MARS_RADIUS = 3_396_000;
const ORIGIN_X = -10668848.651;
const ORIGIN_Y = 5319606.480651;
const PIXEL_SIZE = 14817.845349;

let rasterPromise: Promise<DataView> | undefined;

async function loadRaster(): Promise<DataView> {
  if (!rasterPromise) {
    rasterPromise = (async () => {
      const url = `${import.meta.env.BASE_URL}data/mola-4ppd.bin`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Impossible de charger les données MOLA : ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const expectedSize = WIDTH * HEIGHT * 2;

      if (buffer.byteLength !== expectedSize) {
        throw new Error(
          `Taille MOLA incorrecte : ${buffer.byteLength} octets au lieu de ${expectedSize}.`,
        );
      }

      return new DataView(buffer);
    })().catch((error: unknown) => {
      rasterPromise = undefined;
      throw error;
    });
  }

  return rasterPromise;
}

/**
 * Retourne une estimation de l'altitude MOLA en mètres.
 * Utilise une interpolation bilinéaire entre les pixels voisins.
 * Retourne null si les coordonnées sont invalides ou hors couverture.
 */
export async function getMolaElevation(
  latitude: number,
  longitude: number,
): Promise<number | null> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    return null;
  }

  const longitude360 = ((longitude % 360) + 360) % 360;

  const x =
    MARS_RADIUS * ((longitude360 - 180) * Math.PI / 180);
  const y = MARS_RADIUS * (latitude * Math.PI / 180);

  // Les coordonnées sont converties vers les centres des pixels.
  const column = (x - ORIGIN_X) / PIXEL_SIZE - 0.5;
  const row = (ORIGIN_Y - y) / PIXEL_SIZE - 0.5;

  if (row < 0 || row > HEIGHT - 1) {
    return null;
  }

  // La longitude est circulaire : on peut traverser le méridien 0°.
  const wrappedColumn = ((column % WIDTH) + WIDTH) % WIDTH;

  const x0 = Math.floor(wrappedColumn);
  const x1 = (x0 + 1) % WIDTH;
  const y0 = Math.floor(row);
  const y1 = Math.min(y0 + 1, HEIGHT - 1);

  const fx = wrappedColumn - x0;
  const fy = row - y0;

  const raster = await loadRaster();

  const pixel = (col: number, line: number): number =>
    raster.getInt16((line * WIDTH + col) * 2, true);

  const h00 = pixel(x0, y0);
  const h10 = pixel(x1, y0);
  const h01 = pixel(x0, y1);
  const h11 = pixel(x1, y1);

  return (
    h00 * (1 - fx) * (1 - fy) +
    h10 * fx * (1 - fy) +
    h01 * (1 - fx) * fy +
    h11 * fx * fy
  );
}
