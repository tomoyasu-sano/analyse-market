/**
 * Supabase 接続テスト
 * テーブル作成後に実行: npx ts-node src/test-connection.ts
 */

import { supabase } from './lib/supabase'

async function main() {
  console.log('Supabase 接続テスト中...')

  const { data, error } = await supabase
    .from('amk_collection_logs')
    .select('count')
    .limit(1)

  if (error) {
    console.error('❌ 接続失敗:', error.message)
    console.error('  → Supabase SQL Editor で run_all.sql を実行してください')
    process.exit(1)
  }

  console.log('✅ Supabase 接続成功')
  console.log('✅ amk_collection_logs テーブル確認OK')

  const { error: err2 } = await supabase
    .from('amk_app_rankings')
    .select('count')
    .limit(1)

  if (err2) {
    console.error('❌ amk_app_rankings テーブルが見つかりません:', err2.message)
    process.exit(1)
  }

  console.log('✅ amk_app_rankings テーブル確認OK')
  console.log('\n全テーブル準備完了。収集を開始できます。')
  console.log('  npm run collect:appstore')
  console.log('  npm run collect:googleplay')
}

main().catch(console.error)
