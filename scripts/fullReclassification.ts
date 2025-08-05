#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lykbbceawbrmtursljvk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2JiY2Vhd2JybXR1cnNsanZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY1NjEsImV4cCI6MjA2NTc1MjU2MX0.iRX7O3mnec4D8uW8wfgy__ffPlhK4Aw16Efeb3ymJA8';

const supabase = createClient(supabaseUrl, supabaseKey);

// New 15-category classification logic
function classifyCategories(title: string, description: string): string[] {
  const categories: string[] = [];
  const combinedText = ((title || '') + ' ' + (description || '')).toLowerCase();
  
  // DEFI Category
  if (/\b(defi|yield|lending|liquidity|amm|vault|farm|staking|compound|aave|curve|pool)\b/.test(combinedText)) {
    categories.push('defi');
  }
  
  // TRADING Category (NFT/token trading, not DeFi)
  if (/\b(swap|trade|trading|exchange|market|buy|sell|order|dex|listing|floor|sweep|bulk swap|swap everything|swap boost|trading coach)\b/.test(combinedText) 
     && !categories.includes('defi')) {
    categories.push('trading');
  }
  
  // PAYMENTS Category
  if (/\b(payment|pay|checkout|invoice|receipt|transaction|purchase|credit card|bitcoin|apple cash|streaming payment|instant checkout)\b/.test(combinedText)) {
    categories.push('payments');
  }
  
  // SOCIAL Category
  if (/\b(social|friend|follow|profile|community|network|feed|timeline|share|post|vitalik|people to follow)\b/.test(combinedText)) {
    categories.push('social');
  }
  
  // MESSAGING Category
  if (/\b(message|messaging|chat|dm|inbox|notification|reply|comment|broadcast|chat bubble|chat ticker)\b/.test(combinedText)) {
    categories.push('messaging');
  }
  
  // IDENTITY Category (includes former PFP)
  if (/\b(identity|profile|avatar|pfp|reputation|credential|badge|verification|kyc|did|ens|lens|wrapped|onions app)\b/.test(combinedText)) {
    categories.push('identity');
  }
  
  // PRIVACY Category (includes former security)
  if (/\b(privacy|private|anonymous|security|encryption|secure|protection|vpn|incognito|tumbler|security alert)\b/.test(combinedText)) {
    categories.push('privacy');
  }
  
  // GATING Category
  if (/\b(gate|gating|gated|access|membership|subscription|paywall|token gate|exclusive|whitelist|allowlist|claim)\b/.test(combinedText)) {
    categories.push('gating');
  }
  
  // CREATORS Category (replaces art)
  if (/\b(art|artist|creator|create|mint|nft|collection|gallery|creative|design|music|content|physical art|shotgun mint)\b/.test(combinedText)) {
    categories.push('creators');
  }
  
  // GAMING Category (NEW)
  if (/\b(game|gaming|play|bet|betting|gamble|casino|lottery|prediction|polymarket|double or nothing|treasure hunt)\b/.test(combinedText)) {
    categories.push('gaming');
  }
  
  // TOOLS Category (NEW - for utilities)
  if (/\b(tool|utility|explorer|tracker|analytics|monitor|dashboard|calculator|converter|export|import|translator|generator)\b/.test(combinedText)) {
    categories.push('tools');
  }
  
  // AGENTS Category (more focused)
  if (/\b(agent|ai|llm|gpt|bot|automated|assistant|smart contract agent|phanny|instruct|model selection)\b/.test(combinedText)) {
    categories.push('agents');
  }
  
  // REWARDS Category
  if (/\b(reward|airdrop|points|loyalty|incentive|earn|mining|faucet|bounty|bounties|sharehold to earn)\b/.test(combinedText)) {
    categories.push('rewards');
  }
  
  // DATA Category (NEW)
  if (/\b(data|storage|record|database|index|archive|backup|history|log|tracking|medical record)\b/.test(combinedText)) {
    categories.push('data');
  }
  
  // INFRASTRUCTURE Category (NEW - for dev tools)
  if (/\b(infrastructure|protocol|sdk|api|library|framework|development|deploy|contract|erc|eip|launch l2)\b/.test(combinedText)) {
    categories.push('infrastructure');
  }
  
  return categories;
}

// Reclassify wallet defaults with better logic
function reclassifyItem(title: string, description: string, currentCategories: string[] | null): string[] {
  const combinedText = ((title || '') + ' ' + (description || '')).toLowerCase();
  
  // First check if it's a wallet default that needs reclassification
  const isWalletDefault = !currentCategories || 
                          currentCategories.length === 0 || 
                          (currentCategories.length === 1 && currentCategories[0] === 'wallet');
  
  if (isWalletDefault) {
    // Specific pattern matching for miscategorized items
    
    // UI/UX elements -> tools
    if (/\b(button|menu|tab|interface|ui|ux|widget|component|frame|gesture|setting|preference|config|option|control|mode)\b/.test(combinedText)) {
      return ['tools'];
    }
    
    // Entertainment/lifestyle -> gaming
    if (/\b(astrology|horoscope|ringtone|music|video|movie|show|entertainment|fun|play|game)\b/.test(combinedText)) {
      return ['gaming'];
    }
    
    // Communication -> messaging
    if (/\b(notification|alert|ping|buzz|ring|call|phone|message|chat|dm)\b/.test(combinedText)) {
      return ['messaging'];
    }
    
    // Questions/support -> tools
    if (/\b(question|help|support|faq|guide|tutorial|tip|how|what|where|why)\b/.test(combinedText)) {
      return ['tools'];
    }
    
    // Financial but vague -> payments or trading
    if (/\b(money|cash|fund|dollar|coin|currency|price|cost|fee)\b/.test(combinedText)) {
      if (/\b(pay|send|receive|transfer)\b/.test(combinedText)) {
        return ['payments'];
      }
      return ['trading'];
    }
  }
  
  // Run the new classifier
  const newCategories = classifyCategories(title, description);
  
  // If we have good existing categories and new ones, merge them
  if (!isWalletDefault && currentCategories && currentCategories.length > 0) {
    const merged = [...new Set([...currentCategories.filter(c => c !== 'wallet'), ...newCategories])];
    if (merged.length > 0) return merged;
  }
  
  // If still no categories, default to tools (better than wallet)
  if (newCategories.length === 0) {
    return ['tools'];
  }
  
  return newCategories;
}

// Calculate confidence score
function calculateConfidence(categories: string[], title: string): number {
  let confidence = 0.0;
  
  if (categories.length > 0) {
    confidence = 0.5; // Base confidence
    
    // Single category is often more confident
    if (categories.length === 1) {
      confidence += 0.3;
    } else if (categories.length === 2) {
      confidence += 0.2;
    } else if (categories.length > 3) {
      confidence -= 0.1; // Too many categories
    }
    
    // Boost for clear titles
    if (title && title.length > 3) {
      confidence += 0.1;
    }
    
    // Cap at 1.0
    confidence = Math.min(confidence, 1.0);
  } else {
    confidence = 0.1; // Low confidence for no categories
  }
  
  return confidence;
}

async function fullReclassification() {
  console.log('🚀 Starting full reclassification of all items...\n');
  
  // Fetch all items
  const { data: items, error } = await supabase
    .from('nft_tokens_filtered')
    .select('id, token_id, title, description, category')
    .order('id', { ascending: true });
  
  if (error) {
    console.error('❌ Error fetching items:', error);
    return;
  }
  
  console.log(`📊 Processing ${items?.length} items...\n`);
  
  const updates: any[] = [];
  const categoryDistribution: Record<string, number> = {};
  let processedCount = 0;
  let changedCount = 0;
  let lowConfidenceCount = 0;
  
  // Process each item
  for (const item of items || []) {
    const newCategories = reclassifyItem(
      item.title || '', 
      item.description || '', 
      item.category
    );
    
    const confidence = calculateConfidence(newCategories, item.title || '');
    const needsReview = confidence < 0.5;
    
    // Track distribution
    newCategories.forEach(cat => {
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });
    
    // Check if categories changed
    const oldCats = item.category?.sort().join(',') || '';
    const newCats = newCategories.sort().join(',') || '';
    
    if (oldCats !== newCats) {
      changedCount++;
    }
    
    if (needsReview) {
      lowConfidenceCount++;
    }
    
    // Prepare update
    updates.push({
      id: item.id,
      category: newCategories,
      confidence_score: confidence,
      needs_review: needsReview
    });
    
    processedCount++;
    
    // Progress indicator
    if (processedCount % 100 === 0) {
      console.log(`⏳ Processed ${processedCount}/${items.length} items...`);
    }
  }
  
  console.log('\n📝 Applying updates to database...\n');
  
  // Apply updates in batches
  const batchSize = 50;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    
    // Update each item in the batch
    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('nft_tokens')
        .update({
          category: update.category
        })
        .eq('id', update.id);
      
      if (updateError) {
        console.error(`❌ Error updating item ${update.id}:`, updateError);
      }
    }
    
    console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(updates.length / batchSize)}`);
  }
  
  // Display final results
  console.log('\n📊 Final Category Distribution:');
  console.log('================================');
  
  const sortedCategories = Object.entries(categoryDistribution)
    .sort(([, a], [, b]) => b - a);
  
  const total = items?.length || 0;
  sortedCategories.forEach(([category, count]) => {
    const percentage = ((count / total) * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / 20));
    console.log(`${category.padEnd(15)} ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
  });
  
  console.log('\n📈 Reclassification Metrics:');
  console.log('============================');
  console.log(`Total items processed: ${processedCount}`);
  console.log(`Categories changed: ${changedCount} (${(changedCount / total * 100).toFixed(1)}%)`);
  console.log(`Low confidence items: ${lowConfidenceCount} (${(lowConfidenceCount / total * 100).toFixed(1)}%)`);
  
  // Save detailed results
  const resultsPath = 'full-reclassification-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify({
    metrics: {
      totalItems: total,
      changedCount,
      lowConfidenceCount
    },
    distribution: categoryDistribution,
    updates: updates.slice(0, 100) // Sample of updates
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to ${resultsPath}`);
}

// Run the full reclassification
fullReclassification()
  .then(() => {
    console.log('\n✨ Full reclassification completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Reclassification failed:', error);
    process.exit(1);
  });