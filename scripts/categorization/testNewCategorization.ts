#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lykbbceawbrmtursljvk.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5a2JiY2Vhd2JybXR1cnNsanZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxNzY1NjEsImV4cCI6MjA2NTc1MjU2MX0.iRX7O3mnec4D8uW8wfgy__ffPlhK4Aw16Efeb3ymJA8';

const supabase = createClient(supabaseUrl, supabaseKey);

// New 15-category classification logic (TypeScript version)
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

// Reclassify wallet defaults
function reclassifyWalletDefaults(title: string, description: string, currentCategories: string[] | null): string[] {
  // If only category is 'wallet' or no categories, try to reclassify
  if (!currentCategories || 
      currentCategories.length === 0 || 
      (currentCategories.length === 1 && currentCategories[0] === 'wallet')) {
    
    const combinedText = ((title || '') + ' ' + (description || '')).toLowerCase();
    
    // Check for specific patterns that were miscategorized
    
    // UI/UX elements -> tools
    if (/\b(button|menu|tab|interface|ui|ux|widget|component|frame|gesture)\b/.test(combinedText)) {
      return ['tools'];
    }
    
    // Entertainment -> gaming
    if (/\b(astrology|horoscope|ringtone|music|video|movie|show|entertainment)\b/.test(combinedText)) {
      return ['gaming'];
    }
    
    // Communication -> messaging or social
    if (/\b(notification|alert|ping|buzz|ring|call|phone)\b/.test(combinedText)) {
      return ['messaging'];
    }
    
    // Settings/preferences -> tools
    if (/\b(setting|preference|config|option|control|mode)\b/.test(combinedText)) {
      return ['tools'];
    }
    
    // Questions/support -> tools
    if (/\b(question|help|support|faq|guide|tutorial|tip)\b/.test(combinedText)) {
      return ['tools'];
    }
    
    // Otherwise, run the new classifier
    const newCategories = classifyCategories(title, description);
    
    // If still no categories, mark as tools (better than wallet)
    if (newCategories.length === 0) {
      return ['tools'];
    }
    
    return newCategories;
  }
  
  // Keep existing categories if they're not just wallet
  return currentCategories;
}

// Calculate confidence score
function calculateConfidence(title: string, description: string, categories: string[]): number {
  let confidence = 0.0;
  
  if (categories.length > 0) {
    // Start with base confidence
    confidence = 0.5;
    
    const combinedText = ((title || '') + ' ' + (description || '')).toLowerCase();
    const wordCount = combinedText.split(' ').length;
    
    // Add confidence for specific category matches
    if (categories.length === 1) {
      // Single category is often more confident
      confidence += 0.3;
    } else if (categories.length === 2) {
      // Two categories is reasonable
      confidence += 0.2;
    } else if (categories.length > 3) {
      // Too many categories reduces confidence
      confidence -= 0.1;
    }
    
    // Boost confidence for longer, more descriptive text
    if (wordCount > 5) {
      confidence += 0.1;
    }
    
    // Ensure confidence is between 0 and 1
    confidence = Math.min(Math.max(confidence, 0.0), 1.0);
  } else {
    // No categories found - low confidence
    confidence = 0.1;
  }
  
  return confidence;
}

async function testCategorization() {
  console.log('🧪 Testing new categorization system...\n');
  
  // Fetch sample items
  const { data: items, error } = await supabase
    .from('nft_tokens_filtered')
    .select('id, token_id, title, description, category')
    .limit(100)
    .order('id', { ascending: true });
  
  if (error) {
    console.error('Error fetching items:', error);
    return;
  }
  
  const categoryDistribution: Record<string, number> = {};
  const improvements: any[] = [];
  let walletDefaults = 0;
  let newDefaults = 0;
  let lowConfidence = 0;
  
  // Process each item
  items?.forEach(item => {
    // Apply new categorization
    const newCategories = reclassifyWalletDefaults(
      item.title || '', 
      item.description || '', 
      item.category
    );
    
    const confidence = calculateConfidence(
      item.title || '', 
      item.description || '', 
      newCategories
    );
    
    // Track distribution
    newCategories.forEach(cat => {
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });
    
    // Track improvements
    const oldCats = item.category?.join(',') || 'none';
    const newCats = newCategories.join(',') || 'none';
    
    if (oldCats !== newCats) {
      improvements.push({
        title: item.title,
        old: oldCats,
        new: newCats,
        confidence: confidence.toFixed(2)
      });
    }
    
    // Track metrics
    if (!item.category || (item.category.length === 1 && item.category[0] === 'wallet')) {
      walletDefaults++;
    }
    if (newCategories.length === 1 && newCategories[0] === 'tools') {
      newDefaults++;
    }
    if (confidence < 0.5) {
      lowConfidence++;
    }
  });
  
  // Display results
  console.log('📊 Category Distribution (New System):');
  console.log('=====================================');
  
  const sortedCategories = Object.entries(categoryDistribution)
    .sort(([, a], [, b]) => b - a);
  
  sortedCategories.forEach(([category, count]) => {
    const bar = '█'.repeat(Math.floor(count / 3));
    console.log(`${category.padEnd(15)} ${count.toString().padStart(3)} ${bar}`);
  });
  
  console.log('\n📈 Improvement Metrics:');
  console.log('======================');
  console.log(`Items analyzed: ${items?.length}`);
  console.log(`Old wallet defaults: ${walletDefaults} (${(walletDefaults / items!.length * 100).toFixed(1)}%)`);
  console.log(`New tool defaults: ${newDefaults} (${(newDefaults / items!.length * 100).toFixed(1)}%)`);
  console.log(`Low confidence items: ${lowConfidence} (${(lowConfidence / items!.length * 100).toFixed(1)}%)`);
  console.log(`Changed categorizations: ${improvements.length} (${(improvements.length / items!.length * 100).toFixed(1)}%)`);
  
  console.log('\n🔄 Sample Changes (first 10):');
  console.log('==============================');
  
  improvements.slice(0, 10).forEach(item => {
    console.log(`\n"${item.title}" (confidence: ${item.confidence})`);
    console.log(`  Old: ${item.old}`);
    console.log(`  New: ${item.new}`);
  });
  
  // Export full results
  const resultsPath = 'test-categorization-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify({
    metrics: {
      totalItems: items?.length,
      walletDefaults,
      newDefaults,
      lowConfidence,
      changedCount: improvements.length
    },
    distribution: categoryDistribution,
    changes: improvements
  }, null, 2));
  
  console.log(`\n💾 Full results saved to ${resultsPath}`);
}

// Run the test
testCategorization()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });