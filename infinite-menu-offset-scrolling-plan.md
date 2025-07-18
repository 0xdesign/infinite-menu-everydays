# InfiniteMenu Offset Scrolling Implementation Plan

## Problem Statement
The InfiniteMenu component currently displays only 42 items simultaneously on a sphere (vertices of subdivided icosahedron), but we have 753 total NFT items. Users experience:
- Discovery anxiety (missing items)
- Exploration fatigue (endless random cycling)
- No sense of progress through collection
- Lost serendipity from inability to systematically explore

## Solution: "Offset Window" Scrolling
Implement a sliding window approach where the 42 visible positions show sequential batches of items. Currently items 0-41 display permanently - adding offset slides this window through the entire collection.

## Current Behavior Analysis
- Items 0-41 display permanently on the 42 vertices (no shuffling/cycling)
- Fragment shader: `int itemIndex = vInstanceId % uItemCount;`
- vInstanceId ranges 0-41 (subdivided icosahedron vertices)
- Drag-to-rotate handled separately by ArcballControl (no conflicts with wheel events)

## Implementation Details

### 1. Shader Changes (discFragShaderSource)
**File**: `components/InfiniteMenu.tsx`

Add new uniform and modify item index calculation:
```glsl
uniform int uItemOffset;      // NEW uniform

void main() {
  int itemIndex = (vInstanceId + uItemOffset) % uItemCount;   // CHANGED calculation
  // ... rest of shader unchanged
}
```

### 2. WebGL Uniform Location
**Location**: In `setupShaders()` method

Add to uniform locations object:
```typescript
uItemOffset: gl.getUniformLocation(this.discProgram!, "uItemOffset"),
```

### 3. State Management
**Location**: Class properties

Add new state property:
```typescript
private itemOffset = 0;
```

### 4. Uniform Setting
**Location**: In `render()` method

Set uniform value each frame:
```typescript
gl.uniform1i(this.discLocations.uItemOffset, this.itemOffset);
```

### 5. Input Handling
**Location**: Add to constructor or init method (NO existing wheel handlers to modify)

Add NEW wheel event handler (preserves existing drag-to-rotate):
```typescript
canvas.addEventListener('wheel', (e) => {
  e.preventDefault(); // Critical: prevents page scroll conflicts
  const direction = e.deltaY > 0 ? 1 : -1;
  this.itemOffset = (this.itemOffset + direction + this.items.length) % this.items.length;
});
```

Optional arrow key navigation:
```typescript
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    this.itemOffset = (this.itemOffset + 1) % this.items.length;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    this.itemOffset = (this.itemOffset - 1 + this.items.length) % this.items.length;
  }
});
```

**Note**: Drag-to-rotate (ArcballControl) remains completely unchanged - no conflicts.

### 6. Progress Indicator (Optional)
**Location**: Parent component (likely `app/page.tsx`)

Add React state to track current position:
```typescript
const [currentOffset, setCurrentOffset] = useState(0);

// Pass callback to InfiniteMenu to update offset
// Display: {currentOffset + 1} / {totalItems}
```

## Technical Benefits
- **Minimal code changes**: ~20 lines of code
- **No performance impact**: Uses existing atlas system
- **No geometry changes**: Same 42-vertex sphere
- **Backward compatible**: Existing sphere interactions preserved

## Complete User Experience Vision

### Current State (Frustrating)
- User sees items 0-41 permanently displayed on sphere
- Can drag to rotate sphere, but same 42 items always visible
- No way to discover the other 711 items in collection
- Feels like being trapped in small room of vast museum

### Enhanced Experience (Seamless Discovery)

**Dual Interaction Model:**
- **Mouse/trackpad drag**: Rotates sphere to examine spatial relationships between current 42 items
- **Scroll wheel**: Advances through collection sequentially (like turning pages)
- **Both work simultaneously**: Users can rotate while scrolling for optimal exploration

**Scrolling Behavior:**
- **Granularity**: One scroll tick = one new item appears
- **Direction**: Natural scrolling (wheel down/away = forward through collection 0→1→2...)
- **Wrap-around**: Infinite scrolling (scroll past item 753 → returns to item 0)
- **Speed**: Instant updates with no animation delay

**Progressive Discovery Pattern:**
- **Initial**: Items 0-41 displayed
- **Scroll down 1x**: Items 1-42 (item 0 disappears, item 42 appears)
- **Scroll down 42x**: Complete sphere refresh → items 42-83
- **Continue**: Eventually browse all 753 items systematically

**Spatial Context Preservation:**
- Items maintain relative positions on sphere vertices
- Users can rotate to examine how new items relate spatially
- Visual memory: "That blue NFT was top-left, let me scroll back to find it"

**Mental Model:**
Think of a **cylindrical film strip** wrapped around the sphere:
- Scrolling advances the strip through the projector
- Rotation examines the current frame from different angles
- Creates systematic yet serendipitous browsing experience

### Example User Journey
1. **Arrival**: Sees items 0-41, drags to examine spatial layout
2. **Discovery**: Scrolls down, "Oh, item 42 looks interesting!"
3. **Exploration**: Continues scrolling, discovers item 127 to explore
4. **Navigation**: Scrolls back using spatial memory to find blue NFT from position 23
5. **Flow**: Uses spatial memory + sequential access for efficient browsing

## Implementation Priority
1. Core offset scrolling (steps 1-5)
2. Progress indicator (step 6)
3. Enhanced navigation (arrow keys, jump to position)
4. Polish (smooth transitions, easing)

## Testing & Debug Strategy
1. **Fast iteration**: `npm run dev` + browser refresh (shader changes need full refresh)
2. **Debug access**: Add `onInit={(inst) => (window.menu = inst)}` to expose menu instance
3. **Console testing**: `menu.itemOffset = 17` to jump to position, `gl.getError()` should return 0
4. **Safety**: Comment out wheel handler to instantly revert to original behavior

## Verification Steps
1. Test with full 753-item dataset
2. Verify smooth scrolling through entire collection (1 tick = 1 item advance)
3. Confirm no duplicate items in single view
4. Test edge cases (beginning/end of collection with wrap-around)
5. Validate both wheel scrolling AND drag rotation work simultaneously
6. Check `e.preventDefault()` prevents page scroll conflicts

## Success Metrics
- **Complete collection access**: Users can systematically browse all 753 items
- **Dual interaction preserved**: Both wheel scrolling AND drag rotation work simultaneously
- **Spatial memory**: Users can navigate back to previously seen items using visual landmarks
- **Progressive discovery**: Each scroll reveals exactly one new item with predictable behavior
- **Performance maintained**: No degradation from current 42-item rendering performance
- **Seamless integration**: Wheel scrolling feels natural alongside existing sphere interactions
- **Infinite browsing**: Wrap-around scrolling creates continuous exploration experience
