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
