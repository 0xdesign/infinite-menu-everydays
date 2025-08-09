## Key insight

**Current search is literal and text‑only.** It matches explicit words in `title`/`description` and ignores visual content and domain synonyms/brands. As a result, items that are semantically or visually relevant but don’t contain the exact query term are excluded.

### Sneakers case (why relevant items were missed)
- Appeared in results:
  - id 248 — contains the literal word “sneakers” in the description.
- Missing but visually/semantically relevant:
  - id 603 “Wear‑to‑Earn” — sneaker imagery, no “sneakers” in text.
  - id 724 “Token‑Gated SNKRS” — Nike SNKRS app reference, but no “sneakers” keyword.
  - id 687 “Adidas Burn‑to‑Redeem” — brand‑related, no “sneakers” keyword.

### Root causes (general, not sneaker‑specific)
- **Literal matching bias**: Retrieval depends on explicit text match; visual signals are unindexed.
- **No synonym/brand expansion**: Queries like “sneakers” don’t expand to “SNKRS”, “shoes”, “kicks”, or brand names (Nike, Adidas, Jordan, etc.).
- **Insufficient fuzzy coverage**: Fuzzy matching doesn’t reach descriptions or conceptually related terms.
- **Single‑modal index**: Images and other metadata (e.g., lightweight labels) are not part of the searchable vector.

## Improvements that generalize beyond “sneakers”

1) Query expansion and domain lexicon
- Maintain a small synonym/brand map per domain (e.g., “sneakers” → shoes, kicks, SNKRS; brands → Nike, Adidas, Jordan…).
- Expand user queries before ranking to capture near‑synonyms and brand proxies.

2) Stronger ranking: weighted FTS + fuzzy fallback
- Use Postgres FTS with field weighting (title/category > description).
- Add trigram similarity on both `title` and `description` as a fallback/tie‑breaker.
- Order by FTS rank, category match, similarity, then stable keys.

3) Add lightweight visual labels to the index
- Store `image_labels` (manually curated or model‑generated) and fold them into a `tsvector` with high weight.
- This makes image‑only relevance discoverable without full visual search.

4) Optional semantic re‑ranking
- Add embeddings (pgvector) for `title+description(+labels)`; re‑rank top FTS results by vector similarity for concept queries.

5) Observability loop
- Log query → clicks/zero‑results; refine synonyms, thresholds, and boosts using real usage.

## One‑line summary
**Make search multi‑signal and synonym‑aware:** expand queries with domain terms/brands, index lightweight visual labels, and rank with weighted FTS plus fuzzy fallbacks so semantically/visually relevant items are retrieved even without exact keyword matches.

