-- =====================================================
-- Analyse Market — Phase 4b: 週次サマリー対応
-- Supabase SQL Editor に貼り付けて実行してください
-- =====================================================

-- amk_genai_analyses の analysis_type に weekly_summary を追加
ALTER TABLE amk_genai_analyses
  DROP CONSTRAINT IF EXISTS amk_genai_analyses_analysis_type_check;

ALTER TABLE amk_genai_analyses
  ADD CONSTRAINT amk_genai_analyses_analysis_type_check
  CHECK (analysis_type IN ('weekly_report', 'on_demand', 'weekly_summary'));
