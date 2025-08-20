# Production Site Testing - www.designeverydays.com

## Mobile Bottom Sheet Testing

### Test on Mobile Device:
1. **Open on phone**: https://www.designeverydays.com
2. **Initial State**:
   - [ ] 3D sphere loads with NFT images
   - [ ] Bottom sheet appears at bottom (72px height)
   - [ ] Only NFT title visible in collapsed state
   - [ ] Single drag handle (no duplicates)

3. **Touch Interactions**:
   - [ ] Drag handle up → sheet expands smoothly
   - [ ] Drag handle down → sheet collapses
   - [ ] Tap on collapsed sheet → expands (desktop only)
   - [ ] Touch follows finger during drag

4. **Auto-collapse**:
   - [ ] Rotate sphere to new item → sheet auto-collapses
   - [ ] New item title appears immediately
   - [ ] Smooth transition between items

5. **Top Bar**:
   - [ ] Visible initially
   - [ ] Auto-hides after 3 seconds
   - [ ] Hides when bottom sheet expands
   - [ ] Reappears on touch

## Performance Metrics

### Run these tests:
```bash
# Lighthouse performance test
npx lighthouse https://www.designeverydays.com --view

# Check load time
time curl -o /dev/null -s -w "%{time_total}\n" https://www.designeverydays.com

# Check bundle size
curl -s https://www.designeverydays.com | wc -c
```

### Expected Performance:
- First Contentful Paint: < 2s
- Time to Interactive: < 4s
- Bundle size: < 300KB
- 3D sphere loads: < 3s
- Smooth 60fps interactions

## Known Issues to Check:

1. **Bottom Sheet**:
   - Touch may not work in desktop browser mobile view
   - Test on actual mobile device for accurate results

2. **3D Sphere**:
   - May show loading state initially
   - Should display 750+ NFT items
   - Images should load progressively

3. **Search/Filter**:
   - Search overlay should cover full screen
   - Filter panel should slide from right
   - Both should be accessible from top bar

## Browser Compatibility:
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Android Chrome
- [ ] Desktop Chrome
- [ ] Desktop Safari
- [ ] Desktop Firefox

## Quick Manual Test:
1. Visit https://www.designeverydays.com on phone
2. Wait for sphere to load
3. Try dragging bottom sheet up
4. Rotate sphere and verify auto-collapse
5. Test search and filter functions