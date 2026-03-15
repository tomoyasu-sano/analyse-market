-- =====================================================
-- Analyse Market — Phase 2 マイグレーション
-- Supabase SQL Editor に貼り付けて実行してください
-- =====================================================

-- amk_app_analyses: Gemini API が生成した市場分析レポート
CREATE TABLE IF NOT EXISTS amk_app_analyses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_type    text NOT NULL CHECK (analysis_type IN ('weekly_report', 'gap_analysis', 'on_demand')),
  category         text,
  content          text NOT NULL,
  data_range_start date,
  data_range_end   date,
  tokens_used      integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amk_app_analyses_type_created
  ON amk_app_analyses (analysis_type, created_at DESC);

ALTER TABLE amk_app_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_app_analyses_auth_all" ON amk_app_analyses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- amk_app_recommendations: AI推薦アプリ案（実現可能性評価付き）
CREATE TABLE IF NOT EXISTS amk_app_recommendations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id         uuid REFERENCES amk_app_analyses(id) ON DELETE CASCADE,
  rank                integer NOT NULL,
  app_concept         text NOT NULL,
  category            text,
  target_user         text,
  differentiation     text,
  rationale           text,
  market_size         text CHECK (market_size IN ('large', 'medium', 'niche')),
  competition         text CHECK (competition IN ('low', 'medium', 'high')),
  monetization        text CHECK (monetization IN ('freemium', 'paid', 'ads', 'subscription')),
  rn_feasibility      text NOT NULL CHECK (rn_feasibility IN ('now', 'learn', 'hard', 'hardware')),
  feasibility_reason  text,
  required_skills     text[],
  est_solo_weeks      integer,
  difficulty          text CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_amk_app_recommendations_analysis_feasibility
  ON amk_app_recommendations (analysis_id, rn_feasibility, rank);

ALTER TABLE amk_app_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amk_app_recommendations_auth_all" ON amk_app_recommendations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
