import { useEffect, useState } from "react";
import type { MarsPlace } from "../types/place";
import { getMolaElevation } from "../services/molaElevation";

interface PlaceInfoPanelProps {
  place: MarsPlace;
  onClose: () => void;
}

/** Petit panneau affiché quand l'utilisateur clique un marqueur. */
export default function PlaceInfoPanel({ place, onClose }: PlaceInfoPanelProps) {
  const [elevation, setElevation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setElevation(null);
    setLoading(true);
    setError(false);

    getMolaElevation(place.latitude, place.longitude)
      .then((value) => {
        if (cancelled) return;
        setElevation(value);
        setLoading(false);
      })
      .catch((err: unknown) => {
        console.error("Erreur de lecture des données MOLA :", err);
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [place.latitude, place.longitude]);

  return (
    <div className="place-panel">
      <button className="place-panel__close" onClick={onClose} aria-label="Fermer">
        ×
      </button>

      <h2>{place.name}</h2>

      <p className="place-panel__coords">
        {place.latitude.toFixed(2)}°, {place.longitude.toFixed(2)}°
      </p>

      <div className="place-panel__elevation">
        <strong>Altitude MOLA :</strong>{" "}
        {loading
          ? "Chargement…"
          : error
            ? "Erreur de chargement"
            : elevation === null
              ? "Indisponible"
              : `${Math.round(elevation).toLocaleString("fr-CA")} m`}
      </div>
    </div>
  );
}
