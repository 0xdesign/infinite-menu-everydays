-- Migration: Improved Categorization System
-- Date: 2025-08-05
-- Purpose: Implement 15-category system with confidence scoring and better classification

-- ============================================
-- STEP 1: BACKUP CURRENT DATA
-- ============================================

-- Create backup of current categories (if not exists)
CREATE TABLE IF NOT EXISTS public.nft_tokens_category_backup_v2 AS
SELECT 
    id, 
    token_id,
    title,
    description,
    category,
    text_first_category,
    image_first_category,
    CURRENT_TIMESTAMP as backed_up_at
FROM public.nft_tokens;

-- ============================================
-- STEP 2: ADD NEW COLUMNS
-- ============================================

-- Add new columns for improved categorization
ALTER TABLE public.nft_tokens 
ADD COLUMN IF NOT EXISTS category_v2 text[],
ADD COLUMN IF NOT EXISTS confidence_score float DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS subcategory text,
ADD COLUMN IF NOT EXISTS categorized_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- ============================================
-- STEP 3: CREATE CLASSIFICATION FUNCTIONS
-- ============================================

-- Function: Classify with new 15-category system
CREATE OR REPLACE FUNCTION public.classify_all_categories_v2(
    title text,
    description text
) RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
    categories text[] := ARRAY[]::text[];
    combined_text text;
BEGIN
    -- Combine and normalize text
    combined_text := LOWER(COALESCE(title, '') || ' ' || COALESCE(description, ''));
    
    -- DEFI Category
    IF combined_text ~ '\m(defi|yield|lending|liquidity|amm|vault|farm|staking|compound|aave|curve|pool)\M' THEN
        categories := array_append(categories, 'defi');
    END IF;
    
    -- TRADING Category (NFT/token trading, not DeFi)
    IF combined_text ~ '\m(swap|trade|trading|exchange|market|buy|sell|order|dex|listing|floor|sweep|bulk swap|swap everything|swap boost|trading coach)\M' 
       AND 'defi' != ALL(categories) THEN
        categories := array_append(categories, 'trading');
    END IF;
    
    -- PAYMENTS Category
    IF combined_text ~ '\m(payment|pay|checkout|invoice|receipt|transaction|purchase|credit card|bitcoin|apple cash|streaming payment|instant checkout)\M' THEN
        categories := array_append(categories, 'payments');
    END IF;
    
    -- SOCIAL Category
    IF combined_text ~ '\m(social|friend|follow|profile|community|network|feed|timeline|share|post|vitalik|people to follow)\M' THEN
        categories := array_append(categories, 'social');
    END IF;
    
    -- MESSAGING Category
    IF combined_text ~ '\m(message|messaging|chat|dm|inbox|notification|reply|comment|broadcast|chat bubble|chat ticker)\M' THEN
        categories := array_append(categories, 'messaging');
    END IF;
    
    -- IDENTITY Category (includes former PFP)
    IF combined_text ~ '\m(identity|profile|avatar|pfp|reputation|credential|badge|verification|kyc|did|ens|lens|wrapped|onions app)\M' THEN
        categories := array_append(categories, 'identity');
    END IF;
    
    -- PRIVACY Category (includes former security)
    IF combined_text ~ '\m(privacy|private|anonymous|security|encryption|secure|protection|vpn|incognito|tumbler|security alert)\M' THEN
        categories := array_append(categories, 'privacy');
    END IF;
    
    -- GATING Category
    IF combined_text ~ '\m(gate|gating|gated|access|membership|subscription|paywall|token gate|exclusive|whitelist|allowlist|claim)\M' THEN
        categories := array_append(categories, 'gating');
    END IF;
    
    -- CREATORS Category (replaces art)
    IF combined_text ~ '\m(art|artist|creator|create|mint|nft|collection|gallery|creative|design|music|content|physical art|shotgun mint)\M' THEN
        categories := array_append(categories, 'creators');
    END IF;
    
    -- GAMING Category (NEW)
    IF combined_text ~ '\m(game|gaming|play|bet|betting|gamble|casino|lottery|prediction|polymarket|double or nothing|treasure hunt)\M' THEN
        categories := array_append(categories, 'gaming');
    END IF;
    
    -- TOOLS Category (NEW - for utilities)
    IF combined_text ~ '\m(tool|utility|explorer|tracker|analytics|monitor|dashboard|calculator|converter|export|import|translator|generator)\M' THEN
        categories := array_append(categories, 'tools');
    END IF;
    
    -- AGENTS Category (more focused)
    IF combined_text ~ '\m(agent|ai|llm|gpt|bot|automated|assistant|smart contract agent|phanny|instruct|model selection)\M' THEN
        categories := array_append(categories, 'agents');
    END IF;
    
    -- REWARDS Category
    IF combined_text ~ '\m(reward|airdrop|points|loyalty|incentive|earn|mining|faucet|bounty|bounties|sharehold to earn)\M' THEN
        categories := array_append(categories, 'rewards');
    END IF;
    
    -- DATA Category (NEW)
    IF combined_text ~ '\m(data|storage|record|database|index|archive|backup|history|log|tracking|medical record)\M' THEN
        categories := array_append(categories, 'data');
    END IF;
    
    -- INFRASTRUCTURE Category (NEW - for dev tools)
    IF combined_text ~ '\m(infrastructure|protocol|sdk|api|library|framework|development|deploy|contract|erc|eip|launch l2)\M' THEN
        categories := array_append(categories, 'infrastructure');
    END IF;
    
    -- Return empty array if no matches (avoid defaulting to wallet)
    RETURN categories;
END;
$$;

-- Function: Calculate confidence score
CREATE OR REPLACE FUNCTION public.calculate_confidence_score(
    title text,
    description text,
    categories text[]
) RETURNS float
LANGUAGE plpgsql
AS $$
DECLARE
    confidence float := 0.0;
    word_count int;
    match_strength float;
    combined_text text;
BEGIN
    -- Base confidence from number of categories found
    IF array_length(categories, 1) > 0 THEN
        -- Start with base confidence
        confidence := 0.5;
        
        -- Boost for clear matches
        combined_text := LOWER(COALESCE(title, '') || ' ' || COALESCE(description, ''));
        
        -- Count total words for context
        word_count := array_length(string_to_array(combined_text, ' '), 1);
        
        -- Add confidence for specific category matches
        IF array_length(categories, 1) = 1 THEN
            -- Single category is often more confident
            confidence := confidence + 0.3;
        ELSIF array_length(categories, 1) = 2 THEN
            -- Two categories is reasonable
            confidence := confidence + 0.2;
        ELSIF array_length(categories, 1) > 3 THEN
            -- Too many categories reduces confidence
            confidence := confidence - 0.1;
        END IF;
        
        -- Boost confidence for longer, more descriptive text
        IF word_count > 5 THEN
            confidence := confidence + 0.1;
        END IF;
        
        -- Ensure confidence is between 0 and 1
        confidence := LEAST(GREATEST(confidence, 0.0), 1.0);
    ELSE
        -- No categories found - low confidence
        confidence := 0.1;
    END IF;
    
    RETURN confidence;
END;
$$;

-- Function: Reclassify wallet defaults
CREATE OR REPLACE FUNCTION public.reclassify_wallet_defaults(
    title text,
    description text,
    current_categories text[]
) RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
    new_categories text[];
    combined_text text;
BEGIN
    -- If only category is 'wallet' or no categories, try to reclassify
    IF current_categories IS NULL OR 
       array_length(current_categories, 1) = 0 OR
       (array_length(current_categories, 1) = 1 AND current_categories[1] = 'wallet') THEN
        
        combined_text := LOWER(COALESCE(title, '') || ' ' || COALESCE(description, ''));
        
        -- Check for specific patterns that were miscategorized
        
        -- UI/UX elements -> tools
        IF combined_text ~ '\m(button|menu|tab|interface|ui|ux|widget|component|frame|gesture)\M' THEN
            RETURN ARRAY['tools'];
        END IF;
        
        -- Entertainment -> gaming
        IF combined_text ~ '\m(astrology|horoscope|ringtone|music|video|movie|show|entertainment)\M' THEN
            RETURN ARRAY['gaming'];
        END IF;
        
        -- Communication -> messaging or social
        IF combined_text ~ '\m(notification|alert|ping|buzz|ring|call|phone)\M' THEN
            RETURN ARRAY['messaging'];
        END IF;
        
        -- Settings/preferences -> tools
        IF combined_text ~ '\m(setting|preference|config|option|control|mode)\M' THEN
            RETURN ARRAY['tools'];
        END IF;
        
        -- Questions/support -> tools
        IF combined_text ~ '\m(question|help|support|faq|guide|tutorial|tip)\M' THEN
            RETURN ARRAY['tools'];
        END IF;
        
        -- Otherwise, run the new classifier
        new_categories := public.classify_all_categories_v2(title, description);
        
        -- If still no categories, mark as tools (better than wallet)
        IF array_length(new_categories, 1) = 0 THEN
            RETURN ARRAY['tools'];
        END IF;
        
        RETURN new_categories;
    END IF;
    
    -- Keep existing categories if they're not just wallet
    RETURN current_categories;
END;
$$;

-- Function: Determine primary category from multi-label
CREATE OR REPLACE FUNCTION public.determine_primary_category(
    categories text[]
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    priority_order text[] := ARRAY['defi', 'payments', 'trading', 'agents', 'gaming', 
                                   'creators', 'social', 'identity', 'messaging', 
                                   'gating', 'privacy', 'rewards', 'data', 
                                   'infrastructure', 'tools'];
    cat text;
BEGIN
    -- Return first category in priority order
    FOREACH cat IN ARRAY priority_order LOOP
        IF cat = ANY(categories) THEN
            RETURN cat;
        END IF;
    END LOOP;
    
    -- If no priority match, return first category
    IF array_length(categories, 1) > 0 THEN
        RETURN categories[1];
    END IF;
    
    -- Default to tools if nothing else
    RETURN 'tools';
END;
$$;

-- ============================================
-- STEP 4: RUN INITIAL CLASSIFICATION
-- ============================================

-- First, reclassify all items with the new system
UPDATE public.nft_tokens n
SET 
    category_v2 = COALESCE(
        public.reclassify_wallet_defaults(n.title, n.description, n.category),
        public.classify_all_categories_v2(n.title, n.description)
    ),
    confidence_score = public.calculate_confidence_score(
        n.title, 
        n.description, 
        COALESCE(
            public.reclassify_wallet_defaults(n.title, n.description, n.category),
            public.classify_all_categories_v2(n.title, n.description)
        )
    ),
    needs_review = CASE 
        WHEN public.calculate_confidence_score(
            n.title, 
            n.description, 
            COALESCE(
                public.reclassify_wallet_defaults(n.title, n.description, n.category),
                public.classify_all_categories_v2(n.title, n.description)
            )
        ) < 0.5 THEN true
        ELSE false
    END,
    subcategory = public.determine_primary_category(
        COALESCE(
            public.reclassify_wallet_defaults(n.title, n.description, n.category),
            public.classify_all_categories_v2(n.title, n.description)
        )
    ),
    categorized_at = CURRENT_TIMESTAMP
FROM public.nft_tokens_filtered f
WHERE n.id = f.id;

-- ============================================
-- STEP 5: CREATE ANALYSIS VIEWS
-- ============================================

-- View: Category distribution
CREATE OR REPLACE VIEW public.category_distribution_v2 AS
SELECT 
    unnest(category_v2) as category,
    COUNT(*) as item_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM public.nft_tokens_filtered
WHERE category_v2 IS NOT NULL AND array_length(category_v2, 1) > 0
GROUP BY 1
ORDER BY 2 DESC;

-- View: Items needing review
CREATE OR REPLACE VIEW public.items_needing_review AS
SELECT 
    id,
    token_id,
    title,
    category_v2,
    confidence_score,
    category as old_category
FROM public.nft_tokens_filtered
WHERE needs_review = true
ORDER BY confidence_score ASC;

-- View: Comparison of old vs new categories
CREATE OR REPLACE VIEW public.category_comparison AS
SELECT 
    id,
    token_id,
    title,
    category as old_categories,
    category_v2 as new_categories,
    confidence_score
FROM public.nft_tokens_filtered
WHERE category IS DISTINCT FROM category_v2
ORDER BY confidence_score DESC;

-- ============================================
-- STEP 6: REPORT RESULTS
-- ============================================

-- Show distribution of new categories
SELECT * FROM public.category_distribution_v2;

-- Show items that need manual review
SELECT COUNT(*) as items_needing_review 
FROM public.items_needing_review;

-- Show improvement metrics
SELECT 
    'Old System' as system,
    COUNT(CASE WHEN category IS NULL OR array_length(category, 1) = 0 THEN 1 END) as uncategorized,
    COUNT(CASE WHEN array_length(category, 1) = 1 AND category[1] = 'wallet' THEN 1 END) as wallet_defaults
FROM public.nft_tokens_filtered
UNION ALL
SELECT 
    'New System' as system,
    COUNT(CASE WHEN category_v2 IS NULL OR array_length(category_v2, 1) = 0 THEN 1 END) as uncategorized,
    COUNT(CASE WHEN array_length(category_v2, 1) = 1 AND category_v2[1] = 'tools' THEN 1 END) as tool_defaults
FROM public.nft_tokens_filtered;