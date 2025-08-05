#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lykbbceawbrmtursljvk.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2JiY2Vhd2JybXR1cnNsanZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY1NjEsImV4cCI6MjA2NTc1MjU2MX0.iRX7O3mnec4D8uW8wfgy__ffPlhK4Aw16Efeb3ymJA8';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function toCsvValue(val: any): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('\n') || s.includes('"')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

async function exportImprovedCategories() {
  console.log('📊 Exporting improved categorization results...\n');
  
  // Fetch all items with new categories
  const { data, error } = await supabase
    .from('nft_tokens_filtered')
    .select('id, token_id, title, description, category')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching data:', error);
    process.exit(1);
  }

  // Prepare CSV headers
  const headers = ['id', 'token_id', 'title', 'description', 'new_categories', 'category_count', 'primary_category'];
  const rows = [headers.join(',')];

  // Category statistics
  const categoryStats: Record<string, number> = {};
  const primaryCategoryPriority = [
    'defi', 'payments', 'trading', 'agents', 'gaming', 
    'creators', 'social', 'identity', 'messaging', 
    'gating', 'privacy', 'rewards', 'data', 
    'infrastructure', 'tools'
  ];

  // Process each row
  for (const row of data as any[]) {
    const categories = Array.isArray(row.category) ? row.category : [];
    
    // Determine primary category
    let primaryCategory = 'tools';
    for (const priorityCat of primaryCategoryPriority) {
      if (categories.includes(priorityCat)) {
        primaryCategory = priorityCat;
        break;
      }
    }
    if (categories.length > 0 && !primaryCategoryPriority.includes(categories[0])) {
      primaryCategory = categories[0];
    }
    
    // Update statistics
    categories.forEach((cat: string) => {
      categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });

    // Add to CSV
    rows.push([
      toCsvValue(row.id),
      toCsvValue(row.token_id),
      toCsvValue(row.title || ''),
      toCsvValue(row.description || ''),
      toCsvValue(categories.join('|')),
      toCsvValue(categories.length),
      toCsvValue(primaryCategory)
    ].join(','));
  }

  // Write main CSV
  const outPath = path.resolve(process.cwd(), 'improved-categories.csv');
  fs.writeFileSync(outPath, rows.join('\n'), 'utf8');
  console.log(`✅ Exported ${data?.length ?? 0} items to ${outPath}\n`);

  // Generate statistics report
  console.log('📈 Category Distribution Report:');
  console.log('================================\n');
  
  const sortedStats = Object.entries(categoryStats)
    .sort(([, a], [, b]) => b - a);
  
  const total = data?.length || 0;
  
  // Display distribution
  sortedStats.forEach(([category, count]) => {
    const percentage = ((count / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / 20));
    console.log(`${category.padEnd(15)} ${count.toString().padStart(4)} items (${percentage.padStart(5)}%) ${bar}`);
  });
  
  // Calculate metrics
  const itemsWithCategories = data?.filter((item: any) => 
    item.category && item.category.length > 0
  ).length || 0;
  
  const itemsWithMultiple = data?.filter((item: any) => 
    item.category && item.category.length > 1
  ).length || 0;
  
  const avgCategoriesPerItem = data?.reduce((sum: number, item: any) => 
    sum + (item.category?.length || 0), 0
  ) / total;
  
  console.log('\n📊 Summary Metrics:');
  console.log('==================');
  console.log(`Total items: ${total}`);
  console.log(`Items with categories: ${itemsWithCategories} (${(itemsWithCategories / total * 100).toFixed(1)}%)`);
  console.log(`Items with multiple categories: ${itemsWithMultiple} (${(itemsWithMultiple / total * 100).toFixed(1)}%)`);
  console.log(`Average categories per item: ${avgCategoriesPerItem.toFixed(2)}`);
  console.log(`Total unique categories used: ${sortedStats.length}`);
  
  // Write statistics to separate file
  const statsPath = path.resolve(process.cwd(), 'category-statistics.json');
  fs.writeFileSync(statsPath, JSON.stringify({
    distribution: categoryStats,
    metrics: {
      totalItems: total,
      itemsWithCategories,
      itemsWithMultiple,
      avgCategoriesPerItem,
      uniqueCategories: sortedStats.length
    },
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`\n💾 Statistics saved to ${statsPath}`);
  
  // Identify problematic items
  const problemItems = data?.filter((item: any) => 
    !item.category || item.category.length === 0 || 
    (item.category.length === 1 && item.category[0] === 'tools')
  );
  
  if (problemItems && problemItems.length > 0) {
    console.log(`\n⚠️  Found ${problemItems.length} items that may need manual review`);
    console.log('(Items with no categories or only "tools" category)');
    
    // Save problem items
    const problemPath = path.resolve(process.cwd(), 'items-needing-review.csv');
    const problemRows = ['id,token_id,title,categories'];
    
    problemItems.slice(0, 50).forEach((item: any) => {
      problemRows.push([
        toCsvValue(item.id),
        toCsvValue(item.token_id),
        toCsvValue(item.title || ''),
        toCsvValue((item.category || []).join('|'))
      ].join(','));
    });
    
    fs.writeFileSync(problemPath, problemRows.join('\n'), 'utf8');
    console.log(`📝 First 50 problem items saved to ${problemPath}`);
  }
}

// Run the export
exportImprovedCategories()
  .then(() => {
    console.log('\n✨ Export completed successfully!');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Export failed:', e);
    process.exit(1);
  });