const { createClient } = require('@supabase/supabase-js')

const MEMBER_ID = '3a6de117-4af5-44f2-a42a-47f5193e5473'
const supabase = createClient(
  'https://wfevobupkhhrhkpghphq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmZXZvYnVwa2hocmhrcGdocGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDQ4MDAsImV4cCI6MjA5NjU4MDgwMH0.MWR4BRG3HuzxfvOM-q76CS95b9mw5QAVgcCfxprQA9M'
)

async function main() {
  // Step 1: set stamp_count = 0 in members
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .update({ stamp_count: 0 })
    .eq('id', MEMBER_ID)
    .select('id, stamp_count')

  if (memberError) {
    console.error('Step 1 FAILED:', memberError.message)
    process.exit(1)
  }
  console.log('Step 1 — members updated:', JSON.stringify(memberData, null, 2))

  // Step 2: delete all rows from stamps for this member
  const { data: stampsData, error: stampsError, count } = await supabase
    .from('stamps')
    .delete()
    .eq('member_id', MEMBER_ID)
    .select('id')

  if (stampsError) {
    console.error('Step 2 FAILED:', stampsError.message)
    process.exit(1)
  }
  console.log(`Step 2 — stamps deleted: ${stampsData?.length ?? 0} row(s)`, JSON.stringify(stampsData, null, 2))
}

main().catch(err => { console.error(err); process.exit(1) })
