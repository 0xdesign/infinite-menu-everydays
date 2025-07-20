Below is a practical plan that builds on the **DynamicSphereGeometry** system already present in your repo and guarantees that the sphere always contains *exactly* the number of items returned by the user's current filter—whether that is 753, 37, 10, or 1.

---

### 1  Single → Authoritative data source

* Query Supabase with the active filter (search text, category pill, etc.) and return an `items` array.
* The **length of that array is the only truth** the rendering layer needs; avoid any hidden paging or cycling.

```ts
// lib/supabase.ts
export async function fetchItems(filter?: Filter): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('nft_tokens')
    .select('*')
    .match(filter ?? {})          // apply dynamic filter
    .order('id');

  if (error) throw error;
  return mapRowsToMenuItems(data);
}
```

---

### 2  Prop‑drill the array down to **InfiniteMenu**

In every place you use `<InfiniteMenu items={…} />` pass the *current* array returned from step 1.
No other prop changes are required.

```tsx
const { data: items } = useQuery(['items', filter], () => fetchItems(filter));

return <InfiniteMenu items={items} />;   // <-- always fresh length
```

---

### 3  Geometry adaptation is already solved

`DynamicSphereGeometry.updateItemCount()` recreates or morphs the mesh whenever `items.length` changes, choosing among:

* 1 vertex at `(0, 0, r)`
* Icosahedron (≤ 12)
* Sub‑divided icosahedron (≤ 42)
* Exact‑count Fibonacci sphere (> 42)

and animates the transition with cubic easing for a 500 ms morph. 

You **do not** need to touch this logic; just call:

```ts
sphere.updateItemCount(items.length);
```

…and let the class handle the rest.

---

### 4  Frame loop: glue the two worlds

```ts
// inside InfiniteMenu.render()
useEffect(() => {
  if (sphere.updateItemCount(items.length)) {
    focusController.updateItemCount(items.length);
    // re‑upload per‑instance uniforms if you send opacity/scale
  }
}, [items.length]);
```

* The render loop already pulls `sphere.getCurrentGeometry()` each frame;
  when a transition is in progress `DynamicSphereGeometry` returns the
  interpolated mesh, so visuals are seamless.
* `FocusController` adjusts camera zoom and neighbour opacity automatically.

---

### 5  Texture & instance updates

When the filter changes:

1. **Dispose** textures whose item is no longer present (helps RAM on large jumps).
2. **Upload** textures for new items (lazy‑load if `items.length > 100` to avoid the "700 parallel requests" issue).
3. **Update instance buffer** (UV offset, opacity) to realign with the new vertex order.

Because vertex order may change between geometries, keep the mapping simple:

```ts
// After geometry change
for (let i = 0; i < items.length; i++) {
  instanceData[i].itemIndex = i;          // one‑to‑one
  instanceData[i].atlasUV  = atlasLookup[items[i].id];
}
gl.bufferSubData(..., instanceData);
```

---

### 6  Fixed item size, dynamic spacing

Items maintain constant visual size regardless of sphere density:

* `itemScale` = **constant** (e.g., 0.08 or user-defined)
* `itemOpacity` = **1.0** for all visible items
* Only **sphere radius** and **camera distance** adjust to accommodate density

```ts
// Visual parameters with FIXED item size
const visualParams = {
  itemScale: 0.08,        // CONSTANT - never changes
  sphereRadius: Math.max(1.0, Math.sqrt(items.length) * 0.15),
  cameraDistance: sphereRadius * 2.5 + 2.0,
  focusOpacity: 1.0,
  neighborOpacity: 0.7    // or 1.0 if you want all items fully visible
};
```

**Visual implications:**
- **Sparse spheres** (< 50 items): Items appear well-spaced
- **Dense spheres** (> 500 items): Items may overlap when viewed straight-on
- **Rotation becomes essential** for dense spheres to see all items

---

### 7  Edge cases

* **Zero results** → show an empty state component instead of the sphere.
* **One result** → geometry provides a single vertex; keep standard item scale.
* **Very large (N≫1000)** → keep the Fibonacci logic but reduce texture resolution and switch to `SimpleSquareGeometry` for discs (already supported via `useSimpleGeometry` flag).

---

### 8  Performance checklist

| Concern                                  | Mitigation                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Many rapid keystrokes while filtering    | Debounce API call (e.g. 300 ms) so geometry rebuilds aren't triggered on every character.                       |
| Huge texture churn on dense→sparse→dense | Keep an LRU cache of the last ~256 textures to reuse GPU memory.                                               |
| CPU triangulation for large counts       | Fibonacci distribution is O(n); runs once per filter change and is cached in `geometryCache` (size 10) already. |

---

### 9  Result

* A single source of truth (`items` array)
* One line (`sphere.updateItemCount`) wires UI changes to 3‑D geometry
* No hard caps—the sphere always matches the live query length
* Transitions remain smooth from 753 → 1 → 37 → … without visual or performance cliffs.

---

### 10  Handling density extremes with fixed sizing

Since items don't shrink at high densities:

1. **Overlap mitigation**: 
   - Implement depth-based sorting so nearer items render on top
   - Consider slight transparency (0.9) at very high densities (> 1000)

2. **Interaction precision**:
   - Raycast against item centers, not visual bounds
   - Highlight on hover becomes more important for selection clarity

3. **Performance**:
   - Fixed size = consistent fill rate (good for GPU)
   - May need LOD for extremely dense spheres (> 5000 items)

Implementing nothing beyond the glue code above will give you the dynamic, density‑adaptive Infinite Menu you described, with zero artificial limits on how many or how few items the user sees.