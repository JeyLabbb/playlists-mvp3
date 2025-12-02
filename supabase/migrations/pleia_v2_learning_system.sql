-- PLEIA 2.0 Learning System
-- Sistema de retroalimentación para que la IA aprenda y mejore

-- Habilitar extensión pgvector para embeddings (búsqueda semántica)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de conversaciones completas
CREATE TABLE IF NOT EXISTS pleia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  initial_prompt TEXT NOT NULL,
  final_playlist_id TEXT, -- ID de Spotify si se creó
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Rating del usuario
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de mensajes individuales en cada conversación
CREATE TABLE IF NOT EXISTS pleia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES pleia_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB, -- Info adicional como tracks encontrados, acciones realizadas, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de refinamientos exitosos (para aprender patrones)
CREATE TABLE IF NOT EXISTS pleia_refinements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES pleia_conversations(id) ON DELETE CASCADE,
  refinement_type TEXT NOT NULL, -- 'remove_artist', 'change_genre', 'adjust_energy', etc.
  user_instruction TEXT NOT NULL,
  tracks_before JSONB NOT NULL, -- Array de track IDs antes del refinamiento
  tracks_after JSONB NOT NULL, -- Array de track IDs después
  success_score DECIMAL(3,2), -- Qué tan exitoso fue (0-1)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de patrones de música exitosos
CREATE TABLE IF NOT EXISTS pleia_successful_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_keywords TEXT[], -- Palabras clave del prompt
  genres TEXT[], -- Géneros que funcionaron
  audio_features JSONB, -- Features promedio (energy, valence, etc.)
  artist_ids TEXT[], -- Artistas que aparecen frecuentemente
  track_ids TEXT[], -- Tracks que son frecuentemente incluidos
  usage_count INTEGER DEFAULT 1, -- Cuántas veces se ha usado este patrón
  avg_rating DECIMAL(3,2), -- Rating promedio
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de feedback negativo (para evitar errores)
CREATE TABLE IF NOT EXISTS pleia_negative_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES pleia_conversations(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL, -- 'wrong_genre', 'wrong_energy', 'irrelevant_tracks', etc.
  description TEXT,
  tracks_involved JSONB, -- IDs de tracks problemáticos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de embeddings de prompts (para encontrar similitudes)
CREATE TABLE IF NOT EXISTS pleia_prompt_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embeddings dimension
  successful_pattern_id UUID REFERENCES pleia_successful_patterns(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de preferencias de usuario (aprendizaje personalizado)
CREATE TABLE IF NOT EXISTS pleia_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_genres TEXT[],
  disliked_genres TEXT[],
  preferred_artists TEXT[], -- Spotify artist IDs
  disliked_artists TEXT[],
  audio_feature_preferences JSONB, -- Preferencias de energy, valence, etc.
  common_keywords TEXT[], -- Palabras que usa frecuentemente
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_pleia_conversations_user ON pleia_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_pleia_messages_conversation ON pleia_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pleia_refinements_conversation ON pleia_refinements(conversation_id);
CREATE INDEX IF NOT EXISTS idx_pleia_successful_patterns_usage ON pleia_successful_patterns(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_pleia_successful_patterns_rating ON pleia_successful_patterns(avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_pleia_prompt_embeddings_pattern ON pleia_prompt_embeddings(successful_pattern_id);

-- Row Level Security (RLS)
ALTER TABLE pleia_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pleia_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pleia_refinements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pleia_user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own conversations" ON pleia_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations" ON pleia_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations" ON pleia_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages from their conversations" ON pleia_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM pleia_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations" ON pleia_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM pleia_conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their preferences" ON pleia_user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their preferences" ON pleia_user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Funciones útiles

-- Función para actualizar patrones exitosos
CREATE OR REPLACE FUNCTION update_successful_pattern(
  p_keywords TEXT[],
  p_genres TEXT[],
  p_features JSONB,
  p_artists TEXT[],
  p_tracks TEXT[],
  p_rating DECIMAL
) RETURNS UUID AS $$
DECLARE
  pattern_id UUID;
BEGIN
  -- Buscar patrón similar existente
  SELECT id INTO pattern_id
  FROM pleia_successful_patterns
  WHERE prompt_keywords && p_keywords
    AND genres && p_genres
  ORDER BY (
    ARRAY_LENGTH(prompt_keywords & p_keywords, 1) + 
    ARRAY_LENGTH(genres & p_genres, 1)
  ) DESC
  LIMIT 1;

  IF pattern_id IS NOT NULL THEN
    -- Actualizar patrón existente
    UPDATE pleia_successful_patterns
    SET 
      usage_count = usage_count + 1,
      avg_rating = (avg_rating * usage_count + p_rating) / (usage_count + 1),
      artist_ids = ARRAY(SELECT DISTINCT unnest(artist_ids || p_artists)),
      track_ids = ARRAY(SELECT DISTINCT unnest(track_ids || p_tracks)),
      updated_at = NOW()
    WHERE id = pattern_id;
  ELSE
    -- Crear nuevo patrón
    INSERT INTO pleia_successful_patterns (
      prompt_keywords, genres, audio_features, artist_ids, track_ids, avg_rating
    ) VALUES (
      p_keywords, p_genres, p_features, p_artists, p_tracks, p_rating
    ) RETURNING id INTO pattern_id;
  END IF;

  RETURN pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener patrones relevantes basados en keywords
CREATE OR REPLACE FUNCTION get_relevant_patterns(
  p_keywords TEXT[],
  p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
  pattern_id UUID,
  relevance_score INTEGER,
  pattern_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    (
      ARRAY_LENGTH(p.prompt_keywords & p_keywords, 1) * 2 +
      p.usage_count::INTEGER / 10
    ) as relevance,
    jsonb_build_object(
      'genres', p.genres,
      'audio_features', p.audio_features,
      'artist_ids', p.artist_ids,
      'track_ids', p.track_ids,
      'avg_rating', p.avg_rating,
      'usage_count', p.usage_count
    ) as data
  FROM pleia_successful_patterns p
  WHERE p.prompt_keywords && p_keywords
    AND p.avg_rating >= 3.5
  ORDER BY relevance DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE pleia_conversations IS 'Conversaciones completas de usuarios con PLEIA 2.0';
COMMENT ON TABLE pleia_messages IS 'Mensajes individuales en cada conversación';
COMMENT ON TABLE pleia_refinements IS 'Refinamientos exitosos para aprender patrones';
COMMENT ON TABLE pleia_successful_patterns IS 'Patrones musicales que han funcionado bien';
COMMENT ON TABLE pleia_negative_feedback IS 'Feedback negativo para evitar errores';
COMMENT ON TABLE pleia_prompt_embeddings IS 'Embeddings de prompts para búsqueda semántica';
COMMENT ON TABLE pleia_user_preferences IS 'Preferencias personalizadas de cada usuario';

