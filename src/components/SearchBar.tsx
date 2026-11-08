import { useState, type FormEvent } from "react";
import type { MarsPlace } from "../types/place";

interface SearchBarProps {
  places: MarsPlace[];
  onPickPlace: (place: MarsPlace) => void;
}

/**
 * Barre de recherche : filtre les lieux par nom (sous-chaîne, insensible
 * à la casse) et affiche jusqu'à 5 suggestions. Le bouton « Tout afficher »
 * en bas de la liste déroule tous les lieux disponibles.
 * Valider (Entrée) ou cliquer un lieu déplace la caméra dessus.
 */
export default function SearchBar({ places, onPickPlace }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const normalized = query.trim().toLowerCase();
  const matches =
    normalized.length === 0
      ? []
      : places
          .filter((place) => place.name.toLowerCase().includes(normalized))
          .slice(0, 5);
  const visible = showAll ? places : matches;

  function pick(place: MarsPlace) {
    onPickPlace(place);
    setQuery(place.name);
    setOpen(false);
    setShowAll(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (matches.length > 0) {
      pick(matches[0]);
    }
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search">
      <span className="search-bar__icon" aria-hidden="true">
        ⌕
      </span>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setShowAll(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setShowAll(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Rechercher un lieu (ex. Jezero)"
        aria-label="Rechercher un lieu martien"
      />
      {open && (
        <ul
          className="search-bar__suggestions"
          onMouseDown={(e) => e.preventDefault()}
        >
          {visible.map((place) => (
            <li key={place.id}>
              <button type="button" onClick={() => pick(place)}>
                {place.name}
              </button>
            </li>
          ))}
          {!showAll && places.length > 0 && (
            <li className="search-bar__all">
              <button type="button" onClick={() => setShowAll(true)}>
                Tout afficher ({places.length} lieux)
              </button>
            </li>
          )}
        </ul>
      )}
    </form>
  );
}
