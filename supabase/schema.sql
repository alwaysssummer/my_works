-- BlockNote 데이터베이스 스키마
-- Supabase SQL Editor에서 실행하세요

-- 블록 테이블
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT DEFAULT '',
  content TEXT DEFAULT '',
  indent INTEGER DEFAULT 0,
  is_collapsed BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  "column" TEXT DEFAULT 'inbox',
  properties JSONB DEFAULT '[]'::jsonb,
  sort_order INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 태그 테이블
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 블록 타입 (템플릿) 테이블
CREATE TABLE IF NOT EXISTS block_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#6b7280',
  property_ids JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 커스텀 뷰 테이블
CREATE TABLE IF NOT EXISTS custom_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  color TEXT DEFAULT '#6b7280',
  property_ids JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 설정 테이블
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key, user_id)
);

-- TOP 3 히스토리 테이블
CREATE TABLE IF NOT EXISTS top3_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  blocks JSONB DEFAULT '[]'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, user_id)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_blocks_user_id ON blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_sort_order ON blocks(sort_order);
CREATE INDEX IF NOT EXISTS idx_blocks_column ON blocks("column");
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_block_types_user_id ON block_types(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_views_user_id ON custom_views(user_id);
CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);
CREATE INDEX IF NOT EXISTS idx_top3_history_user_date ON top3_history(user_id, date);

-- RLS (Row Level Security) 정책
-- 인증 없이 사용할 경우 (익명 사용자)
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE top3_history ENABLE ROW LEVEL SECURITY;

-- 익명 사용자도 읽기/쓰기 가능 (user_id가 null인 경우)
-- 나중에 인증 추가 시 정책 수정 필요

CREATE POLICY "Allow anonymous access to blocks" ON blocks
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous access to tags" ON tags
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous access to block_types" ON block_types
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous access to custom_views" ON custom_views
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous access to settings" ON settings
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

CREATE POLICY "Allow anonymous access to top3_history" ON top3_history
  FOR ALL USING (user_id IS NULL) WITH CHECK (user_id IS NULL);

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- blocks 테이블에 트리거 적용
DROP TRIGGER IF EXISTS blocks_updated_at ON blocks;
CREATE TRIGGER blocks_updated_at
  BEFORE UPDATE ON blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- settings 테이블에 트리거 적용
DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
