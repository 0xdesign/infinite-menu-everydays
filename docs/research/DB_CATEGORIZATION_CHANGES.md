## Database and Categorization Change Log

This document summarizes the database objects, categorization functions, and data migrations that were created or updated during the categorization work.

### Overview
- Implemented a durable categorization system based on single-word, use‑case oriented categories.
- Introduced multi-label classification (an item can belong to multiple categories).
- Limited the application dataset to two Zora collections using a database view.
- Added classifier functions for text- and image/visual-hint driven categorization.
- Applied folds: security → privacy, pfp → identity.
- Produced a CSV export of the current assignments for review.

### Final Category Taxonomy (12)
- wallet
- payments
- rewards
- trading
- invest
- social
- messaging
- agents
- privacy (absorbed "security")
- gating
- art
- identity (absorbed "pfp")

### Database Objects

#### 1) View: `public.nft_tokens_filtered`
Filters to the two allowed Zora collections so all app queries only see those items.

```sql
create or replace view public.nft_tokens_filtered as
select n.*
from public.nft_tokens n
where n.collection_address in (
  '0x5908eb01497b5d8e53c339ea0186050d487c8d0c',
  '0x5abf0c04ab7196e2bdd19313b479baebd9f7791b'
);
```

#### 2) Table changes: `public.nft_tokens`
- category: text[] — multi-label category array (existing field used extensively)
- subcat: text — added earlier for experimentation (no longer used by the app)
- primary_category: text — earlier experimentation (not used now)
- primary_category_14: text — earlier experimentation (not used now)
- primary_category_final: text — earlier experimentation (not used now)
- image_first_category: text — single-label derived primarily from visual/UX hints
- text_first_category: text — single-label derived from text + existing signals
- final_category: text — earlier experimentation (not used now)

Additionally created once as a safety snapshot:

```sql
create table if not exists public.nft_tokens_category_bak as
select id, category from public.nft_tokens;
```

#### 3) Indexes
- Collection filter performance:

```sql
create index if not exists idx_nft_tokens_collection_address
  on public.nft_tokens (collection_address);
```

### Classifier Functions

All functions are in the `public` schema.

- `categorize_item(title text, description text) returns text[]`
  - Early rule-based categorizer used in the first iterations.

- `classify_category_from_current(title text, description text, cats text[]) returns text`
  - Computes a single best category using existing category signals plus text.

- `classify_category_14(title text, description text) returns text`
  - Single-label classifier for the previous 14-category phase.

- `classify_all_categories_14(title text, description text) returns text[]`
  - Multi-label classifier; emits any/all matching categories (14-category phase).

- `classify_all_categories_12(title text, description text) returns text[]`
  - Multi-label classifier reflecting the folds:
    - Treats security-like signals as privacy.
    - Treats pfp/avatar-like signals as identity.

- `classify_image_category_from_current(cats text[]) returns text`
  - Heuristic visual-first single label derived from the current category mix.
  - Updated so that pfps/avatars roll into identity, and security-like cues roll into privacy.


### Data Migrations and Operations

Chronological highlights (all scoped to the filtered dataset via `nft_tokens_filtered`):

1) Limit dataset to two Zora collections
```sql
create or replace view public.nft_tokens_filtered as ...
```

2) Initial multi-label classification (14-category phase)
```sql
update public.nft_tokens n
set category = coalesce(public.classify_all_categories_14(n.title, n.description), array[]::text[])
from public.nft_tokens_filtered f
where n.id = f.id;
```

3) Folds: security → privacy, pfp → identity
```sql
update public.nft_tokens n
set category = (
  select case when count(*)=0 then null else array_agg(distinct mapped) end
  from (
    select case
      when c = 'security' then 'privacy'
      when c = 'pfp' then 'identity'
      else c end as mapped
    from unnest(coalesce(n.category, array[]::text[])) as c
  ) s
)
from public.nft_tokens_filtered f
where n.id = f.id;
```

4) First-category helper columns (single-label views)
```sql
alter table public.nft_tokens add column if not exists text_first_category text;
alter table public.nft_tokens add column if not exists image_first_category text;

update public.nft_tokens n
set text_first_category = public.classify_category_from_current(n.title, n.description, n.category)
from public.nft_tokens_filtered f
where n.id = f.id;

update public.nft_tokens n
set image_first_category = public.classify_image_category_from_current(n.category)
from public.nft_tokens_filtered f
where n.id = f.id;
```

5) Merge single-label hints into multi-label array (deduped)
```sql
update public.nft_tokens n
set category = (
  select array_agg(distinct c)
  from unnest(
         coalesce(n.category, array[]::text[])
      || case when n.image_first_category is not null then array[n.image_first_category] else array[]::text[] end
      || case when n.text_first_category  is not null then array[n.text_first_category]  else array[]::text[] end
  ) as c
)
from public.nft_tokens_filtered f
where n.id = f.id;
```

### Current Distribution (multi-label)
As of the last run across the filtered dataset:
- trading: 89
- payments: 73
- gating: 68
- identity: 62
- social: 58
- art: 54
- agents: 53
- messaging: 49
- privacy: 34
- rewards: 29
- invest: 26
- wallet: 18

Use to recompute at any time:
```sql
select unnest(category) as category, count(*) as n
from public.nft_tokens_filtered
where category is not null
group by 1
order by 2 desc;
```

### CSV Export
A CSV snapshot was generated for external review:
- Path: `exported-categories.csv`
- Columns: `id, token_id, title, categories (pipe-delimited), text_first_category, image_first_category`
- Rows: 706

To regenerate locally:
```bash
npm run export:csv
```

### Rollback Notes
- Category array backup exists (if created on your instance):
```sql
create table if not exists public.nft_tokens_category_bak as
select id, category from public.nft_tokens;
```
- To restore categories from backup snapshot (example):
```sql
update public.nft_tokens n
set category = b.category
from public.nft_tokens_category_bak b
where n.id = b.id;
```

### Notes
- Subcategory (`subcat`) and various `primary_*` columns remain for historical analysis but are not used by the application.
- All app queries for items and categories read from `nft_tokens_filtered` to ensure the collection constraint is always honored.