-- =====================================================
-- Analyse Market — Phase 4 マイグレーション
-- Supabase SQL Editor に貼り付けて実行してください
-- =====================================================

-- 1. amk_genai_items の source CHECK 制約拡張（producthunt 追加）
ALTER TABLE amk_genai_items
  DROP CONSTRAINT IF EXISTS amk_genai_items_source_check;

ALTER TABLE amk_genai_items
  ADD CONSTRAINT amk_genai_items_source_check
  CHECK (source IN ('anthropic', 'openai', 'google', 'github', 'hackernews', 'reddit', 'npm', 'producthunt'));

-- 2. amk_genai_items の item_type CHECK 制約拡張
ALTER TABLE amk_genai_items
  DROP CONSTRAINT IF EXISTS amk_genai_items_item_type_check;

ALTER TABLE amk_genai_items
  ADD CONSTRAINT amk_genai_items_item_type_check
  CHECK (item_type IN ('blog', 'changelog', 'repo', 'discussion', 'package_release', 'package_update', 'product', 'blog_post'));

-- 3. amk_trend_signals テーブル作成（Google Trends）
CREATE TABLE IF NOT EXISTS amk_trend_signals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL,
  keyword      text NOT NULL,
  category     text,
  score        numeric NOT NULL DEFAULT 0,
  momentum     text CHECK (momentum IN ('rising', 'stable', 'falling')),
  raw_data     jsonb,
  collected_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amk_trend_signals_source_collected
  ON amk_trend_signals (source, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_amk_trend_signals_keyword
  ON amk_trend_signals (keyword, collected_at DESC);

ALTER TABLE amk_trend_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_trend_signals_service_all" ON amk_trend_signals
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
