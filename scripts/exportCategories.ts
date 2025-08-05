import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lykbbceawbrmtursljvk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2JiY2Vhd2JybXR1cnNsanZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY1NjEsImV4cCI6MjA2NTc1MjU2MX0.iRX7O3mnec4D8uW8wfgy__ffPlhK4Aw16Efeb3ymJA8'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

function toCsvValue(val: any): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

async function main() {
  const { data, error } = await supabase
    .from('nft_tokens_filtered')
    .select('id, token_id, title, category, text_first_category, image_first_category')
    .order('id', { ascending: true })

  if (error) {
    console.error('Error fetching data:', error)
    process.exit(1)
  }

  const headers = ['id','token_id','title','categories','text_first_category','image_first_category']
  const rows = [headers.join(',')]

  for (const row of data as any[]) {
    const categories = Array.isArray(row.category) ? row.category.join('|') : ''
    rows.push([
      toCsvValue(row.id),
      toCsvValue(row.token_id),
      toCsvValue(row.title || ''),
      toCsvValue(categories),
      toCsvValue(row.text_first_category || ''),
      toCsvValue(row.image_first_category || ''),
    ].join(','))
  }

  const outPath = path.resolve(process.cwd(), 'exported-categories.csv')
  fs.writeFileSync(outPath, rows.join('\n'), 'utf8')
  console.log('Wrote', data?.length ?? 0, 'rows to', outPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
