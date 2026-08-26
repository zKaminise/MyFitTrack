// Dados de enriquecimento gerados por scripts/enrich-exercises.mjs.
// Fonte: free-exercise-db (Unlicense / dominio publico). Apenas metadados +
// URLs remotas de imagem (o binario nunca e embutido no bundle).
import raw from './exerciseEnrichment.json';

export interface EnrichmentEntry {
  source: string;
  sourceExerciseId: string;
  confidence: number | null;
  via: 'auto' | 'override';
  mediaType: 'image' | 'gif' | 'video' | 'none';
  images: string[];
  bodyPart: string | null;
  instructionsEn: string[];
}

export const EXERCISE_ENRICHMENT: Record<string, EnrichmentEntry> =
  raw as Record<string, EnrichmentEntry>;
