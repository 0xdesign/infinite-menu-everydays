-- Search improvements: FTS + trigram + ranked RPC

-- 1) Ensure useful extensions
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- 2) Add a generated tsvector on the base table
alter table if exists public.nft_tokens
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('english', unaccent(coalesce(description, ''))), 'B') ||
    -- categories are simple tokens; weight high to favor categorical matches
    setweight(to_tsvector('simple', array_to_string(coalesce(category, '{}')::text[], ' ')), 'A')
  ) stored;

-- 3) Indexes
create index if not exists idx_nft_tokens_search_vector on public.nft_tokens using gin(search_vector);
create index if not exists idx_nft_tokens_title_trgm on public.nft_tokens using gin (title gin_trgm_ops);

-- 4) Ranked search RPC over the filtered view
create or replace function public.rpc_search_nfts(q text, cats text[] default null)
returns setof public.nft_tokens_filtered
language sql
stable
as $$
  select n.*
  from public.nft_tokens_filtered n
  where
    -- categories filter (match any)
    (cats is null or array_length(cats,1) is null or n.category && cats)
    and (
      coalesce(q, '') = ''
      or n.search_vector @@ websearch_to_tsquery('english', unaccent(q))
      or similarity(n.title, q) > 0.35
    )
  order by
    -- FTS rank first
    ts_rank_cd(n.search_vector, websearch_to_tsquery('english', unaccent(coalesce(q, '')))) desc,
    -- boost items matching selected categories
    case when cats is not null and array_length(cats,1) is not null and n.category && cats then 1 else 0 end desc,
    -- fuzzy similarity on title as tie-breaker
    similarity(n.title, coalesce(q, '')) desc nulls last,
    -- deterministic fallback
    n.id asc
  limit 200;
$$;

-- 5) (Optional) Grant execute to anon/service roles if needed
-- grant execute on function public.rpc_search_nfts(text, text[]) to anon, authenticated, service_role;

