-- ============================================================================
-- Migration: 20260816_performance_indexes.sql
-- Description: Indices de alto rendimiento para Wax (Foreign Keys, filtros y ordenación)
-- ============================================================================

-- 1. TABLA: reviews
-- Índices para búsqueda por álbum (página de álbum, calificaciones)
CREATE INDEX IF NOT EXISTS idx_reviews_album_id ON reviews (album_id);

-- Índices para búsqueda por usuario y orden cronológico (página de perfil, feed)
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON reviews (user_id, created_at DESC);

-- Índice para recomendaciones y afinidad (filtros rating >= 6 y rating >= 7)
CREATE INDEX IF NOT EXISTS idx_reviews_user_rating ON reviews (user_id, rating);

-- Índice para el feed global y landing reciente
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at DESC);


-- 2. TABLA: posts
-- Índices para búsqueda de posts por usuario y orden cronológico
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts (user_id, created_at DESC);

-- Índice para posts asociados a un álbum
CREATE INDEX IF NOT EXISTS idx_posts_album_id ON posts (album_id);

-- Índice para el feed global
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);


-- 3. TABLA: follows
-- Relación seguidor -> seguido (búsqueda de 'siguiendo' y conteo)
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows (follower_id);

-- Relación seguido -> seguidor (conteo de 'seguidores')
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows (following_id);

-- Clave única compuesta para evitar duplicados y acelerar chequeo de estado mutuo
CREATE UNIQUE INDEX IF NOT EXISTS idx_follows_follower_following ON follows (follower_id, following_id);


-- 4. TABLA: post_likes
-- Búsqueda de likes por post y conteo
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes (post_id);

-- Búsqueda de posts que le gustaron a un usuario (perfil tab likes)
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes (user_id);

-- Clave única compuesta para 'like/unlike' idempotente
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_user_post ON post_likes (user_id, post_id);


-- 5. TABLA: post_comments
-- Búsqueda de comentarios por post ordenados cronológicamente
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created ON post_comments (post_id, created_at ASC);

-- Búsqueda de comentarios por usuario
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments (user_id);


-- 6. TABLA: respins
-- Búsqueda de respins por post y por usuario
CREATE INDEX IF NOT EXISTS idx_respins_post_id ON respins (post_id);
CREATE INDEX IF NOT EXISTS idx_respins_user_id ON respins (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_respins_user_post ON respins (user_id, post_id);


-- 7. TABLA: albums
-- Búsqueda por ID de álbum
CREATE INDEX IF NOT EXISTS idx_albums_album_id ON albums (album_id);

-- Top álbumes en el sidebar del feed (orden por total_ratings)
CREATE INDEX IF NOT EXISTS idx_albums_total_ratings ON albums (total_ratings DESC NULLS LAST);

-- Búsqueda por artist_spotify_id cacheado
CREATE INDEX IF NOT EXISTS idx_albums_artist_spotify_id ON albums (artist_spotify_id);


-- 8. TABLA: profiles
-- Búsqueda de perfil por username (búsqueda insensible o directa)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (lower(username));


-- 9. TABLA: quiz_scores
-- Tabla de posiciones (leaderboard por puntaje)
CREATE INDEX IF NOT EXISTS idx_quiz_scores_best_score ON quiz_scores (best_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_scores_user_id ON quiz_scores (user_id);


-- 10. TABLA: genre_artist_cache
-- Búsqueda y paginación por género y posición
CREATE INDEX IF NOT EXISTS idx_genre_artist_cache_tag_position ON genre_artist_cache (tag, position ASC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_genre_artist_cache_tag_spotify ON genre_artist_cache (tag, spotify_id);
