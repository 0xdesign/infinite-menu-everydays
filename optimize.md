Below is a focused codebase review and a concrete re‑architecture plan to make image rendering **stable** and **fast (≤ 400 ms to paint)** on the default view and after category filtering.

---

## TL;DR (what’s wrong + what to change)

**Root causes**

1. **You rebuild the entire WebGL instance on every filter change.** That tears down GPU state and re-uploads atlases → big stalls and late paints. Use the existing `updateItems()` path instead of re‑instantiating.&#x20;

2. **Atlas page mismatch.** The shader samples only 3 atlases (`uTex`, `uTex1`, `uTex2`), but your deck needs \~12 at current tile sizes; anything beyond 3 silently “falls back” to atlas 0, which is why items **change** when a tile snaps into place. Either pack everything into **3 pages** or adopt a **2D texture array**. (Your own architecture note flags the same issue.)&#x20;

3. **Position-map texture bug.** You gate float textures on `EXT_color_buffer_float` and fall back to 8‑bit RGBA, but the fragment shader still reads only `mappingValue.r * 1024.0`. On devices where your fallback runs (often mobile), mapping values are wrong → wrong atlas cell → images “swap.” Fix: always upload a float data texture (WebGL2 allows sampling float textures without that extension) **or** decode the two 8‑bit channels in the shader.&#x20;

4. **Preload/headers mismatch.** You preload `/atlas-0.webp`, but the app actually loads `/atlas-master-*.webp` + `/atlas-master.json`. So the browser isn’t warming the critical assets; first paint waits on network. Align `<link rel="preload">` and cache headers to the files you really use.&#x20;

5. **O(n²) mapping lookup.** `buildAtlasPositionMap()` does `Array.find(...)` per item. That’s minor but unnecessary work on filter. Keep a `Map<string, AtlasEntry>` in memory.&#x20;

---

## What “good” looks like

* **Default page:** first meaningful frame (the sphere with correct tiles) in **≤ 400 ms** on desktop broadband:

  * mapping JSON (≤ 50–100 KB) + **one** atlas page preloaded + instance buffer upload → render
  * additional atlas pages stream in, but **no visual tile swaps**
* **After filtering:** **≤ 150–250 ms** to show a correct, stable filtered sphere:

  * reuse the WebGL instance; only update instance matrices + **position map texture**; **no texture re-uploads**, **no new program creation**

---

## Fixes (ordered, minimal to invasive)

### 1) Stop recreating WebGL on filter changes (biggest speedup)

Today `InfiniteMenu`’s effect disposes and recreates the whole instance whenever `items` changes. That’s the main reason filters feel slow. Use the class’ built-in `updateItems()` (already implemented) and keep the instance hot.

**Change `components/InfiniteMenu.tsx`**: split mount vs. updates.

```tsx
// Mount once
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas || menuInstanceRef.current) return;

  const handleActiveItem = (index: number) => {
    const itemIndex = index % (items.length || 1);
    const item = (items.length ? items : defaultItems)[itemIndex];
    setActiveItem(item);
    onItemFocus?.(item);
  };

  const inst = new InfiniteGridMenu(
    canvas,
    items.length ? items : defaultItems,
    handleActiveItem,
    setIsMoving,
    (sk) => sk.run(),
    initialFocusId,
    () => setTimeout(() => setIsLoading(false), 100)
  );
  menuInstanceRef.current = inst;

  const onResize = () => inst.resize();
  window.addEventListener("resize", onResize);
  onResize();

  return () => {
    window.removeEventListener("resize", onResize);
    inst.dispose();
    menuInstanceRef.current = null;
  };
}, []);

// Update items only (no dispose/recreate)
useEffect(() => {
  if (menuInstanceRef.current) {
    menuInstanceRef.current.updateItems(items.length ? items : defaultItems);
  }
}, [items]);
```

This taps into your existing `updateItems()` which already regenerates positions, updates matrices, rebuilds the mapping texture, and **does not** rebuild atlases or programs.&#x20;

---

### 2) Make the position-map texture always correct (fixes “image changes”)

**Bug now:** you check for `EXT_color_buffer_float` to decide whether you can upload a float texture. That extension is only needed for *rendering to* float textures, not *sampling* them. In WebGL2, you can upload/sampler fetch a float data texture without it. Your fallback packs a 16‑bit value across R and G, but the shader still reads only R. Result: wrong cell on many devices.&#x20;

**Two safe options (pick one):**

**A. Always use float (simplest).**
In `buildAtlasPositionMap()`:

* Remove the extension gate.
* Use `gl.R32F` (single channel) instead of `gl.RGBA32F` and upload a `Float32Array(maxItems)`; in the shader, sample `mappingValue.r`.

**B. Keep 8‑bit fallback but decode both bytes.**
Keep your byte packing, and change the fragment shader:

```glsl
// If using 8-bit RG textures for mapping:
vec4 mv = texelFetch(uAtlasPositionMap, ivec2(itemIndex, 0), 0);
float high = mv.r * 255.0;
float low  = mv.g * 255.0;
int atlasPosition = int(high * 256.0 + low);
```

Either way guarantees the GPU gets the **correct** atlas cell for every filtered array index, so the preview image **doesn’t change** when an item snaps.&#x20;

---

### 3) Resolve the 3‑atlas limit (prevents wrong tiles beyond \~192 items)

Right now the shader supports just 3 samplers:

```glsl
uniform sampler2D uTex;   // 0
uniform sampler2D uTex1;  // 1
uniform sampler2D uTex2;  // 2
// else: falls back to uTex (WRONG)
```

…and anything where `atlasIndex > 2` falls back to atlas 0. That’s exactly the “tile turns into another image” artifact you’re seeing once you spin/snap through items from later pages.&#x20;

**Two ways to fix (choose one):**

**Option 3.1 (fastest to ship): pack everything into 3 pages.**
Change your build step (atlas generator) to:

* **Desktop:** `4096×4096` page, **tile 256×256**, **16×16 = 256 tiles/page** → 3 pages cover 768 items.
* **Mobile:** also use the same 4096 + 256 tiling (do not use the `1024` + `256` mobile atlas, it would need \~45 pages). The compressed WebP size is still moderate; memory is fine for a 3‑page RGBA atlas in WebGL2.

Then set `uAtlasSize = 16` (not 8/4), remove the “mobile atlas” split and always load `atlas-master-0/1/2.webp`. Your **IMAGE\_LOADING\_ARCHITECTURE.md** already points at this solution (“Reduce tile size back to 256x… fits in 3 atlases”).&#x20;

**Option 3.2 (more robust): switch to a 2D texture array.**
Use `sampler2DArray` and upload all pages into a single `TEXTURE_2D_ARRAY`. Then the shader samples with layer = `atlasIndex`, removing the 3‑sampler cap across devices. This gives you future headroom, but it’s a slightly larger change set.

Either option eliminates the “image changes on snap” problem for items beyond the third page.

---

### 4) Preload the real assets and set proper cache headers (≤ 400 ms paint)

You currently preload `/atlas-0.webp`, `/atlas.json`, which aren’t the assets you actually use (you load `/atlas-master-*.webp` and `/atlas-master.json`). Align head tags and headers.&#x20;

**`app/layout.tsx`** (replace the existing preloads):

```tsx
<head>
  {/* ... keep supabase preconnect if you still open originals in modals ... */}
  <link rel="preload" href="/atlas-master-0.webp" as="image" type="image/webp" />
  <link rel="preload" href="/atlas-master-1.webp" as="image" type="image/webp" />
  <link rel="preload" href="/atlas-master-2.webp" as="image" type="image/webp" />
  <link rel="preload" href="/atlas-master.json" as="fetch" crossOrigin="anonymous" />
  <link rel="preload" href="/data/items.json" as="fetch" crossOrigin="anonymous" />
</head>
```

**`next.config.ts`** (cache the mapping too):

```ts
async headers() {
  return [
    { source: '/:path*.webp', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    { source: '/data/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=43200' }] },
    { source: '/atlas-master.json', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
  ];
}
```

With the right preloads, the browser starts the atlas/mapping fetch **before** React/GL boot, easily getting you under **\~400 ms** to first stable frame on broadband.&#x20;

---

### 5) Make mapping lookups O(1)

Inside `buildAtlasPositionMap()` each filtered item does:

```ts
const atlasEntry = this.atlasMapping.find(e => e.id === item.id?.toString());
```

Create a `Map<string, AtlasEntry>` once, at atlas load time, then just `get(id)`. This trims JS work on filter from \~tens of ms to microseconds and avoids GC churn.&#x20;

---

### 6) Keep preview and snapped image identical (no more “swap”)

* You already set `image` and `imageHighRes` to the same URL to avoid swaps in 2D UI. Keep that.&#x20;
* In the WebGL path, eliminate the hi‑res overlay mix (`uHighTex`) entirely (you already stubbed `loadHighResTexture`), or only enable it **iff** the hi‑res is sourced from **the same crop** as the atlas tile. Otherwise users will see a subtle change at snap.&#x20;

---

## Would I re‑architect? Yes — minimally like this:

**Now (fast path; 1–2 days of changes)**

1. **Persistent WebGL instance** + `updateItems()` on filters (Section 1).
2. **Float position map** or correct 8‑bit decode (Section 2).
3. **Three atlas pages only** via 4096/256 tiling everywhere + `uAtlasSize=16` (Section 3.1).
4. **Correct preloads / headers** (Section 4).
5. **Mapping Map<>** (Section 5).

This path keeps your current shader/program structure and gets you both **speed** and **consistency**.

**Next (robust, future-proof)**

* Move to a **2D texture array** (`sampler2DArray`) and drop the 3‑page limit entirely (Section 3.2).
* Add a **“two‑phase commit”** for updates: build the new position map texture off-screen, then atomically swap the uniform to the new map on the next frame. This avoids any transient mismatch mid-frame when filtering.&#x20;

---

## Why this solves your two symptoms

* **Slow loads:** You stop re-creating the GL context, stop re-uploading textures, and actually **preload the right assets**. Only the mapping + matrices change on filter. First paint comes from already‑resident atlases → **sub‑400 ms** is realistic on desktop.&#x20;

* **Image changes on snap / drag:**

  * The atlas page limit no longer forces a fallback sample from atlas 0.
  * The mapping texture always decodes to the correct cell across devices.
  * The hi‑res overlay does not replace the tile at snap (or uses the same crop), so what you see while dragging is **exactly** what you see when it snaps into focus.&#x20;

---

## Extra small wins (nice to have)

* In `InfiniteMenu` render loop, you already pre‑allocate matrices/vecs (good). Keep the instanced draw path exactly as is.&#x20;
* Consider adding a **tiny LQ atlas** (e.g., 1024 page with 64×64 tiles) that you preload inline (data URI or `rel=preload`) and show for the first frame, then swap to the full atlas on the next frame. Because the **tile indices are identical**, this never “changes” the image—just the sharpness. (You’ve basically set this up by disabling the hi‑res overlay; this is the same idea but for the whole sphere.)&#x20;

---

## Checklist you can hand to an engineer

1. **Do not** dispose and recreate `InfiniteGridMenu` on `items` changes; call `updateItems()` instead.&#x20;
2. In `buildAtlasPositionMap()`:

   * **Remove** the `EXT_color_buffer_float` gate and upload an `R32F` (or RGBA32F) **float** texture; keep the shader reading `.r`. **OR** keep RGBA8 but **decode R+G** in the shader.&#x20;
3. Change atlas generator to **4096px pages, 256px tiles**, **3 pages total**, and **uAtlasSize=16** always. Delete the 1024px “mobile” atlas.&#x20;
4. Update `<head>` preloads to `/atlas-master-0/1/2.webp` + `/atlas-master.json`. Add a cache header for `/atlas-master.json`.&#x20;
5. Build a `Map<string, AtlasEntry>` from the mapping JSON and use it in `buildAtlasPositionMap()` (no `Array.find`).&#x20;
6. Keep `uHighTex` overlay **disabled** unless you guarantee identical crop; otherwise remove the code path.&#x20;

Do the 5 “Now” items and you’ll get a stable preview while dragging, no snap‑to image change, and a first useful frame under \~400 ms on desktop broadband.
