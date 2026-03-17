-- 공유 링크 테이블
-- Supabase 대시보드 SQL Editor에서 실행

CREATE TABLE shared_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  share_type TEXT NOT NULL DEFAULT 'students',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS (Row Level Security) - 공유 페이지에서 anon 접근 허용
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- anon 사용자도 token으로 조회 가능 (공유 페이지 접근용)
CREATE POLICY "Anyone can read active shared links"
  ON shared_links
  FOR SELECT
  USING (is_active = true);

-- 인증된 사용자만 생성/수정 가능
CREATE POLICY "Authenticated users can insert shared links"
  ON shared_links
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update shared links"
  ON shared_links
  FOR UPDATE
  TO authenticated
  USING (true);

-- anon에도 INSERT/UPDATE 허용 (현재 앱이 anon key 사용)
CREATE POLICY "Anon can insert shared links"
  ON shared_links
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update shared links"
  ON shared_links
  FOR UPDATE
  TO anon
  USING (true);
