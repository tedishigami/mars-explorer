import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as Cesium from "cesium";
import type { MarsPlace } from "../types/place";
import { MARS_ELLIPSOID } from "../services/marsImagery";
import { getMolaElevation } from "../services/molaElevation";
import {
  RELIEF_EXAGGERATION,
  createMolaReliefMaterial,
  createMolaTerrainProvider,
} from "../services/molaTerrain";

interface MarsGlobeProps {
  places: MarsPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (place: MarsPlace | null) => void;
  /** Appelé quand le zoom change (100 = vue de départ). */
  onZoomChange?: (percent: number) => void;
}

/** Les deux modes d'affichage : globe d'origine ou relief MOLA coloré. */
export type MarsViewMode = "globe" | "relief";

/** Ce que le parent (App) peut demander au globe de faire. */
export interface MarsGlobeHandle {
  flyToPlace: (place: MarsPlace) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setMode: (mode: MarsViewMode) => Promise<void>;
  resetView: () => void;
}

/** Hauteur de caméra (mètres) utilisée quand on "arrive" sur un lieu. */
const FLY_TO_HEIGHT = 400_000;

/** Hauteur de la vue de départ (Mars entière, vue depuis l'espace). */
const HOME_HEIGHT = 15_000_000;

/**
 * Le globe 3D de Mars.
 *
 * Ce composant est le seul endroit de l'app qui parle directement à
 * l'API Cesium. Le reste de l'application (recherche, panneau d'info)
 * ne manipule que des `MarsPlace` et des callbacks React.
 */
const MarsGlobe = forwardRef<MarsGlobeHandle, MarsGlobeProps>(
  function MarsGlobe({ places, selectedPlaceId, onSelectPlace, onZoomChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Cesium.Viewer | null>(null);
    const entitiesByPlaceId = useRef<Map<string, Cesium.Entity>>(new Map());
    const tilesetRef = useRef<Cesium.Cesium3DTileset | null>(null);
    const reliefGlobeRef = useRef<Cesium.Globe | null>(null);
    const modeRef = useRef<MarsViewMode>("globe");
    const onZoomChangeRef = useRef(onZoomChange);
    onZoomChangeRef.current = onZoomChange;
    const elevationByPlaceId = useRef<Map<string, number>>(new Map());

    /** Place chaque marqueur sur le relief affiché (mode relief) ou à 0 m (mode globe). */
    async function applyMarkerHeights() {
      const relief = modeRef.current === "relief";
      for (const place of places) {
        const entity = entitiesByPlaceId.current.get(place.id);
        if (!entity) continue;
        let elevation = 0;
        if (relief) {
          let cached = elevationByPlaceId.current.get(place.id);
          if (cached === undefined) {
            cached = (await getMolaElevation(place.latitude, place.longitude)) ?? 0;
            elevationByPlaceId.current.set(place.id, cached);
            if (modeRef.current !== "relief") return;
          }
          elevation = cached * RELIEF_EXAGGERATION;
        }
        entity.position = new Cesium.ConstantPositionProperty(
          Cesium.Cartesian3.fromDegrees(
            place.longitude,
            place.latitude,
            elevation,
            MARS_ELLIPSOID,
          ),
        );
      }
    }

    // Crée le viewer Cesium une seule fois, au montage du composant.
    useEffect(() => {
      if (!containerRef.current) return;

      const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
      if (!token) {
        console.error("Jeton Cesium ion absent : vérifie le fichier .env.local.");
        return;
      }

      Cesium.Ion.defaultAccessToken = token;
      Cesium.Ellipsoid.default = Cesium.Ellipsoid.MARS;

      const viewer = new Cesium.Viewer(containerRef.current, {
        // Mars est fournie par un tileset global, pas par le globe terrestre.
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
        mapProjection: new Cesium.GeographicProjection(MARS_ELLIPSOID),
      });

      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#05060a");
      if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
      if (viewer.scene.sun) viewer.scene.sun.show = false;
      if (viewer.scene.moon) viewer.scene.moon.show = false;

      // Chargement des images et du relief martiens depuis Cesium ion.
      Cesium.Cesium3DTileset.fromIonAssetId(3644333)
        .then((tileset) => {
          if (viewer.isDestroyed()) {
            tileset.destroy();
            return;
          }
          tileset.show = modeRef.current === "globe";
          tilesetRef.current = tileset;
          viewer.scene.primitives.add(tileset);
        })
        .catch((error) => {
          console.error("Impossible de charger Cesium Mars :", error);
        });

      // Vue de départ : Mars entière, vue depuis l'espace.
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(0, 0, HOME_HEIGHT, MARS_ELLIPSOID),
      });

      const clickHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      clickHandler.setInputAction(
        (movement: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
          const picked = viewer.scene.pick(movement.position);
          const placeId: string | undefined = picked?.id?.properties?.placeId?.getValue();
          if (placeId) {
            const place = places.find((p) => p.id === placeId) ?? null;
            onSelectPlace(place);
          } else {
            onSelectPlace(null);
          }
        },
        Cesium.ScreenSpaceEventType.LEFT_CLICK,
      );

      viewerRef.current = viewer;

      // Masque les marqueurs situés derrière l'horizon de Mars.
      const scaledCamera = new Cesium.Cartesian3();
      const scaledPoint = new Cesium.Cartesian3();
      const scaledToPoint = new Cesium.Cartesian3();
      // Pourcentage de zoom : 100 % = vue de départ (HOME_HEIGHT).
      let lastZoomPercent = -1;
      const removeZoomWatch = viewer.scene.preRender.addEventListener(() => {
        const height = Math.max(viewer.camera.positionCartographic.height, 1);
        const percent = Math.max(1, Math.round((HOME_HEIGHT / height) * 100));
        if (
          lastZoomPercent < 0 ||
          Math.abs(percent - lastZoomPercent) >= Math.max(1, lastZoomPercent * 0.01)
        ) {
          lastZoomPercent = percent;
          onZoomChangeRef.current?.(percent);
        }
      });

      const removeOcclusion = viewer.scene.preRender.addEventListener(() => {
        Cesium.Cartesian3.multiplyComponents(
          viewer.camera.positionWC,
          MARS_ELLIPSOID.oneOverRadii,
          scaledCamera,
        );
        const horizonSq = Cesium.Cartesian3.magnitudeSquared(scaledCamera) - 1;
        const now = viewer.clock.currentTime;
        entitiesByPlaceId.current.forEach((entity) => {
          const position = entity.position?.getValue(now);
          if (!position) {
            entity.show = true;
            return;
          }
          Cesium.Cartesian3.multiplyComponents(
            position,
            MARS_ELLIPSOID.oneOverRadii,
            scaledPoint,
          );
          Cesium.Cartesian3.subtract(scaledPoint, scaledCamera, scaledToPoint);
          const along = -Cesium.Cartesian3.dot(scaledToPoint, scaledCamera);
          const hidden =
            horizonSq < 0
              ? along > 0
              : along > horizonSq &&
                (along * along) / Cesium.Cartesian3.magnitudeSquared(scaledToPoint) >
                  horizonSq;
          entity.show = !hidden;
        });
      });

      return () => {
        removeZoomWatch();
        removeOcclusion();
        clickHandler.destroy();
        viewer.destroy();
        viewerRef.current = null;
        tilesetRef.current = null;
        reliefGlobeRef.current = null;
      };
      // Le viewer n'est créé qu'une fois : `places`/`onSelectPlace` sont
      // lus via les refs/closures ci-dessus, pas besoin de recréer le
      // globe si ces props changent de référence.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ajoute un marqueur par lieu. Recalculé si la liste de lieux change.
    useEffect(() => {
      const viewer = viewerRef.current;
      if (!viewer) return;

      entitiesByPlaceId.current.forEach((entity) => viewer.entities.remove(entity));
      entitiesByPlaceId.current.clear();

      for (const place of places) {
        const entity = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            place.longitude,
            place.latitude,
            0,
            MARS_ELLIPSOID,
          ),
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString("#e8734a"),
            outlineColor: Cesium.Color.fromCssColorString("#0b0d12"),
            outlineWidth: 2,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: place.name,
            font: "13px system-ui, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#e8e4dd"),
            outlineColor: Cesium.Color.fromCssColorString("#05060a"),
            outlineWidth: 3,
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 12),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          properties: { placeId: place.id },
        });
        entitiesByPlaceId.current.set(place.id, entity);
      }
      if (modeRef.current === "relief") void applyMarkerHeights();
    }, [places]);

    // Met en évidence le marqueur sélectionné.
    useEffect(() => {
      entitiesByPlaceId.current.forEach((entity, id) => {
        const isSelected = id === selectedPlaceId;
        if (entity.point) {
          entity.point.pixelSize = new Cesium.ConstantProperty(isSelected ? 14 : 10);
          entity.point.color = new Cesium.ConstantProperty(
            Cesium.Color.fromCssColorString(isSelected ? "#ffb199" : "#e8734a"),
          );
        }
      });
    }, [selectedPlaceId]);

    useImperativeHandle(ref, () => ({
      flyToPlace(place: MarsPlace) {
        const viewer = viewerRef.current;
        if (!viewer) return;
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            place.longitude,
            place.latitude,
            FLY_TO_HEIGHT +
              (modeRef.current === "relief"
                ? (elevationByPlaceId.current.get(place.id) ?? 0) * RELIEF_EXAGGERATION
                : 0),
            MARS_ELLIPSOID,
          ),
          duration: 1.8,
        });
      },
      zoomIn() {
        const viewer = viewerRef.current;
        if (!viewer) return;
        viewer.camera.zoomIn(viewer.camera.positionCartographic.height * 0.4);
      },
      zoomOut() {
        const viewer = viewerRef.current;
        if (!viewer) return;
        viewer.camera.zoomOut(viewer.camera.positionCartographic.height * 0.6);
      },
      resetView() {
        const viewer = viewerRef.current;
        if (!viewer) return;
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(0, 0, HOME_HEIGHT, MARS_ELLIPSOID),
          duration: 1.5,
        });
      },
      async setMode(mode: MarsViewMode) {
        const viewer = viewerRef.current;
        if (!viewer) return;
        modeRef.current = mode;
        if (mode === "relief" && !reliefGlobeRef.current) {
          const provider = await createMolaTerrainProvider(MARS_ELLIPSOID);
          if (viewer.isDestroyed()) return;
          if (!reliefGlobeRef.current) {
            const globe = new Cesium.Globe(MARS_ELLIPSOID);
            globe.terrainProvider = provider;
            globe.baseColor = Cesium.Color.fromCssColorString("#9a8069");
            globe.enableLighting = false;
            globe.material = createMolaReliefMaterial(viewer.scene);
            viewer.scene.globe = globe;
            reliefGlobeRef.current = globe;
          }
        }
        if (tilesetRef.current) {
          tilesetRef.current.show = modeRef.current === "globe";
        }
        if (reliefGlobeRef.current) {
          reliefGlobeRef.current.show = modeRef.current === "relief";
        }
        viewer.scene.verticalExaggeration =
          modeRef.current === "relief" ? RELIEF_EXAGGERATION : 1;
        try {
          await applyMarkerHeights();
        } catch (error) {
          console.error("Hauteur des marqueurs impossible :", error);
        }
      },
    }));

    return <div ref={containerRef} className="mars-globe" />;
  },
);

export default MarsGlobe;
