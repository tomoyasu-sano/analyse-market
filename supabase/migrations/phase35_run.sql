-- =====================================================
-- Analyse Market — Phase 3.5 マイグレーション
-- Supabase SQL Editor に貼り付けて実行してください
-- =====================================================

-- amk_genai_items: GenAI チャンネルで収集した記事・リポジトリ
CREATE TABLE IF NOT EXISTS amk_genai_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel          text NOT NULL DEFAULT 'genai',
  source           text NOT NULL CHECK (source IN ('anthropic', 'openai', 'google', 'github', 'hackernews', 'reddit', 'npm')),
  item_type        text NOT NULL CHECK (item_type IN ('blog', 'changelog', 'repo', 'discussion', 'package_release')),
  title            text NOT NULL,
  url              text NOT NULL,
  summary          text,
  relevance_score  integer NOT NULL DEFAULT 0,
  tags             text[],
  raw_data         jsonb,
  published_at     timestamptz,
  collected_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amk_genai_items_source_collected
  ON amk_genai_items (source, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_amk_genai_items_score_collected
  ON amk_genai_items (relevance_score DESC, collected_at DESC);

ALTER TABLE amk_genai_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_genai_items_auth_all" ON amk_genai_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- amk_genai_analyses: GenAI チャンネルの AI分析レポート
CREATE TABLE IF NOT EXISTS amk_genai_analyses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type    text NOT NULL CHECK (analysis_type IN ('weekly_report', 'on_demand')),
  content          text NOT NULL,
  highlights       jsonb,
  data_range_start date,
  data_range_end   date,
  tokens_used      integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amk_genai_analyses_type_created
  ON amk_genai_analyses (analysis_type, created_at DESC);

ALTER TABLE amk_genai_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_genai_analyses_auth_all" ON amk_genai_analyses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
