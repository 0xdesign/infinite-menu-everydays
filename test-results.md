# Test Results

## Test Setup
1. Navigate to http://localhost:3001
2. Open browser console (F12 or Cmd+Option+I on Mac)
3. Test each scenario:
   - Full dataset (All categories)
   - Filtered dataset (Select a category)
   - Search results

## What to Look For

When you **select a category** (to filter items), you should immediately see:
```
VERTEX COUNT TEST: {
  items_length: [number],      // e.g., 4
  DISC_INSTANCE_COUNT: [number], // e.g., 753
  instancePositions_length: [number], // e.g., 753
  needsUpdate: [boolean]       // true or false
}
```

When you **drag and release** the sphere, you should see:
```
POSITION TEST: {
  nearestVertexIndex: [number],
  instancePositions_length: [number],
  items_length: [number],
  calculated_itemIndex: [number],
  DISC_INSTANCE_COUNT: [number]
}

ATLAS MAPPING TEST: {
  itemIndex: [number],
  item_id: [number],
  item_title: [string],
  atlas_has_item: [boolean],
  atlas_position: [number or "NOT FOUND"],
  expected_shader_atlas: [number],
  expected_shader_position: [number]
}

HIGH-RES TEST: {
  index: [number],
  item_id: [number],
  item_image: [url],
  item_imageHighRes: [url],
  are_different: [boolean]
}
```

Every second, you'll see:
```
INSTANCE BUFFER TEST: {
  instances_matrices_length: [number],
  items_count: [number],
  DISC_INSTANCE_COUNT: [number],
  buffer_initialized: [boolean]
}
```

## Hypothesis 1: Vertex Count Mismatch (85% confidence)
**Test**: Check console for "VERTEX COUNT TEST"

**Results**: [TO BE FILLED]
```
// Expected for filtered view:
VERTEX COUNT TEST: {
  items_length: 4,
  DISC_INSTANCE_COUNT: 753,  // ← Problem if different from items_length
  instancePositions_length: 753,
  needsUpdate: true
}
```

## Hypothesis 2: Instance Positions Not Regenerating (80% confidence)
**Test**: Check console for "POSITION TEST" when releasing drag

**Results**: [TO BE FILLED]
```
// Expected problem:
POSITION TEST: {
  nearestVertexIndex: 450,  // Large number
  instancePositions_length: 753,  // Doesn't match items
  items_length: 4,
  calculated_itemIndex: 2,  // 450 % 4 = 2
  DISC_INSTANCE_COUNT: 753
}
```

## Hypothesis 3: Instance Buffer Not Updating (75% confidence)
**Test**: Check console for "INSTANCE BUFFER TEST" (logs every second)

**Results**: [TO BE FILLED]
```
// Expected problem:
INSTANCE BUFFER TEST: {
  instances_matrices_length: 753,  // Should match items_count
  items_count: 4,
  DISC_INSTANCE_COUNT: 753,
  buffer_initialized: true
}
```

## Hypothesis 4: Atlas Mapping Assumptions (60% confidence)
**Test**: Check console for "ATLAS MAPPING TEST" when snapping

**Results**: [TO BE FILLED]
```
// Expected for filtered items:
ATLAS MAPPING TEST: {
  itemIndex: 2,
  item_id: 123,
  item_title: "Some NFT",
  atlas_has_item: true,  // Should be true if pre-built atlas has this item
  atlas_position: 122,   // Position in atlas
  expected_shader_atlas: 0,
  expected_shader_position: 2
}
```

## Hypothesis 5: High-Res Texture Loading (40% confidence)
**Test**: Check console for "HIGH-RES TEST" when snapping

**Results**: [TO BE FILLED]
```
// Expected:
HIGH-RES TEST: {
  index: 2,
  item_id: 123,
  item_image: "https://..._thumb.jpg",
  item_imageHighRes: "https://..._large.jpg",
  are_different: true
}
```

## Analysis

Based on the test results, the most likely cause is: [TO BE DETERMINED]

## Recommended Fix

[TO BE FILLED based on test results]