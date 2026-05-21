-- =============================================
-- صحتك+ | Medical Platform - Database Schema
-- PostgreSQL
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ───────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone         VARCHAR(20),
  gender        VARCHAR(10) CHECK (gender IN ('male','female','other')),
  birth_date    DATE,
  role          VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','admin','doctor')),
  is_verified   BOOLEAN DEFAULT FALSE,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CATEGORIES ──────────────────────────────
CREATE TABLE categories (
  id          SERIAL PRIMARY KEY,
  name_ar     VARCHAR(100) NOT NULL,
  name_en     VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) UNIQUE NOT NULL,
  icon        VARCHAR(10),
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO categories (name_ar, name_en, slug, icon) VALUES
('القلب والأوعية', 'Cardiology', 'cardiology', '❤️'),
('السكري والغدد', 'Endocrinology', 'endocrinology', '🩸'),
('الجهاز الهضمي', 'Gastroenterology', 'gastroenterology', '🫁'),
('العظام والمفاصل', 'Orthopedics', 'orthopedics', '🦴'),
('الصحة النفسية', 'Mental Health', 'mental-health', '🧠'),
('الجهاز التنفسي', 'Pulmonology', 'pulmonology', '🌬️'),
('صحة الأطفال', 'Pediatrics', 'pediatrics', '👶'),
('التغذية والوزن', 'Nutrition', 'nutrition', '🥗');

-- ─── ARTICLES ────────────────────────────────
CREATE TABLE articles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(300) NOT NULL,
  slug          VARCHAR(300) UNIQUE NOT NULL,
  summary       TEXT,
  content       TEXT NOT NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  cover_url     TEXT,
  is_published  BOOLEAN DEFAULT FALSE,
  views         INTEGER DEFAULT 0,
  read_time_min INTEGER DEFAULT 3,
  tags          TEXT[],
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CHAT SESSIONS ───────────────────────────
CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) DEFAULT 'محادثة طبية',
  session_key VARCHAR(100) UNIQUE,         -- للزوار غير المسجلين
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CHAT MESSAGES ───────────────────────────
CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
  content     TEXT NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SYMPTOM CHECKS ──────────────────────────
CREATE TABLE symptom_checks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  session_key VARCHAR(100),
  symptoms    TEXT[] NOT NULL,
  ai_response TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BOOKMARKS ───────────────────────────────
CREATE TABLE bookmarks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- ─── CONTACTS ────────────────────────────────
CREATE TABLE contacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(150) NOT NULL,
  email      VARCHAR(255) NOT NULL,
  subject    VARCHAR(300),
  message    TEXT NOT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────
CREATE INDEX idx_articles_category  ON articles(category_id);
CREATE INDEX idx_articles_published ON articles(is_published, published_at DESC);
CREATE INDEX idx_articles_slug      ON articles(slug);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_symptom_checks_user ON symptom_checks(user_id);

-- ─── UPDATED_AT TRIGGER ──────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated    BEFORE UPDATE ON users    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_articles_updated BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();