-- Habilita pgvector para búsqueda de candidatos por similitud (capa de evidencia).
-- La búsqueda vectorial solo recupera candidatos; nunca decide la conciliación.
CREATE EXTENSION IF NOT EXISTS vector;
