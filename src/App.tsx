import { useRef, useState } from "react";
import MarsGlobe, {
  type MarsGlobeHandle,
  type MarsViewMode,
} from "./components/MarsGlobe";
import SearchBar from "./components/SearchBar";
import PlaceInfoPanel from "./components/PlaceInfoPanel";
import { MARS_PLACES } from "./data/marsPlaces";
import { MARS_IMAGERY_CREDIT } from "./services/marsImagery";
import { MOLA_RELIEF_STOPS, RELIEF_EXAGGERATION } from "./services/molaTerrain";
import type { MarsPlace } from "./types/place";
import "./App.css";

const LEGEND_MAX = Math.max(...MOLA_RELIEF_STOPS.map((stop) => stop.height));
const LEGEND_MIN = Math.min(...MOLA_RELIEF_STOPS.map((stop) => stop.height));

/** Position verticale (en %) d'une altitude sur la légende : le haut = le plus haut. */
function legendTop(height: number): number {
  return ((LEGEND_MAX - height) / (LEGEND_MAX - LEGEND_MIN)) * 100;
}

const LEGEND_GRADIENT =
  "linear-gradient(to bottom, " +
  [...MOLA_RELIEF_STOPS]
    .reverse()
    .map((stop) => "rgb(" + stop.rgb.join(",") + ") " + legendTop(stop.height).toFixed(1) + "%")
    .join(", ") +
  ")";

export default function App() {
  const globeRef = useRef<MarsGlobeHandle>(null);
  const [selectedPlace, setSelectedPlace] = useState<MarsPlace | null>(null);
  const [viewMode, setViewMode] = useState<MarsViewMode>("globe");
  const [modeLoading, setModeLoading] = useState(false);
  const [modeError, setModeError] = useState<string | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);

  async function changeMode(next: MarsViewMode) {
    if (next === viewMode || modeLoading) return;
    setModeLoading(true);
    setModeError(null);
    try {
      await globeRef.current?.setMode(next);
      setViewMode(next);
    } catch (error) {
      console.error("Changement de mode impossible :", error);
      setModeError("Le relief MOLA n'a pas pu être chargé.");
    } finally {
      setModeLoading(false);
    }
  }

  function goToPlace(place: MarsPlace) {
    setSelectedPlace(place);
    globeRef.current?.flyToPlace(place);
  }

  return (
    <div className="app">
      <MarsGlobe
        ref={globeRef}
        places={MARS_PLACES}
        selectedPlaceId={selectedPlace?.id ?? null}
        onSelectPlace={setSelectedPlace}
        onZoomChange={setZoomPercent}
      />

      <header className="top-bar">
        <div className="top-bar__brand">
          <span className="top-bar__dot" aria-hidden="true" />
          MARS EXPLORER
        </div>
        <SearchBar places={MARS_PLACES} onPickPlace={goToPlace} />
      </header>

      {selectedPlace && (
        <PlaceInfoPanel place={selectedPlace} onClose={() => setSelectedPlace(null)} />
      )}

      <div className="zoom-controls">
        <div className="zoom-percent">Zoom {zoomPercent.toLocaleString("fr-FR")} %</div>
        <button type="button" onClick={() => globeRef.current?.zoomIn()} aria-label="Zoomer">
          +
        </button>
        <button type="button" onClick={() => globeRef.current?.zoomOut()} aria-label="Dézoomer">
          −
        </button>
        <button
          type="button"
          onClick={() => globeRef.current?.resetView()}
          aria-label="Revenir à la vue de départ"
          title="Vue de départ"
        >
          🏠
        </button>
      </div>

      <div className="mode-toggle">
        <button
          type="button"
          className={viewMode === "globe" ? "is-active" : ""}
          disabled={modeLoading}
          onClick={() => changeMode("globe")}
        >
          Globe
        </button>
        <button
          type="button"
          className={viewMode === "relief" ? "is-active" : ""}
          disabled={modeLoading}
          onClick={() => changeMode("relief")}
        >
          {modeLoading ? "Chargement…" : "Relief MOLA"}
        </button>
        {modeError && (
          <span role="alert" className="mode-toggle__error">
            {modeError}
          </span>
        )}
      </div>

      {viewMode === "relief" && (
        <aside className="relief-legend" aria-label="Échelle d'altitude">
          <div className="relief-legend__title">Altitude (MOLA)</div>
          <div className="relief-legend__body">
            <div className="relief-legend__bar" style={{ background: LEGEND_GRADIENT }} />
            <div className="relief-legend__ticks">
              {MOLA_RELIEF_STOPS.map((stop) => (
                <span key={stop.height} style={{ top: legendTop(stop.height) + "%" }}>
                  {(stop.height / 1000).toString().replace("-", "−") + " km"}
                </span>
              ))}
            </div>
          </div>
          <div className="relief-legend__note">
            Relief exagéré ×{RELIEF_EXAGGERATION} pour la lisibilité.
          </div>
        </aside>
      )}

      <footer className="credit">{MARS_IMAGERY_CREDIT}</footer>
    </div>
  );
}
