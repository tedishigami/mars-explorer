/**
 * Un lieu d'intérêt sur Mars.
 *
 * Volontairement minimal pour la V0 (nom + coordonnées). Les futures
 * versions pourront étendre ce type avec des champs optionnels
 * (altitude, description scientifique, type de terrain, images,
 * rover associé, etc.) sans casser ce qui existe déjà.
 */
export interface MarsPlace {
  /** Identifiant stable, utilisé comme clé React et pour la sélection. */
  id: string;
  /** Nom affiché à l'utilisateur. */
  name: string;
  /** Latitude en degrés (planétocentrique), positif vers le nord. */
  latitude: number;
  /** Longitude en degrés, positif vers l'est. */
  longitude: number;
}
