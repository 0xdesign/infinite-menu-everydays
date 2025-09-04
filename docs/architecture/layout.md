# Layout Redesign Implementation

## Overview
Redesigning the infinite menu interface to match Figma specifications with responsive desktop and mobile layouts.

## Key Design Changes

### Desktop Layout (1440px+)
1. **Top Navigation Bar**
   - Logo/Title left-aligned
   - Expandable search bar (collapsed by default, expands on focus)
   - "ABOUT" link right-aligned (placeholder for future page)

2. **Left Sidebar - Filter Menu**
   - Minimal text-only category buttons
   - Active state: Full white text with horizontal line indicator
   - Inactive state: 60% opacity white text
   - Categories: ALL, PAYMENTS, TRADING, AGENTS, SOCIAL, IDENTITY, MESSAGING, GATING, PRIVACY, REWARDS, ART, INVEST, WALLET

3. **Center - 3D Sphere**
   - Main focus area
   - Maintains existing WebGL implementation

4. **Right Sidebar - Metadata Panel**
   - Item title and date
   - Category tags (AGENTS, TRADING)
   - Description text
   - ZORA-MAINNNET link
   - Hash link (0x5abf0x...f791b)
   - "VIEW ORIGINAL" button

5. **Bottom Controls**
   - Results count (bottom left): "705 results"
   - Expand button (bottom center): Full-width modal for focused image

### Mobile Layout (<768px)
1. **Top Bar**
   - FILTER button (left)
   - SEARCH button (right)
   - Both as rounded pill buttons

2. **Main View**
   - Full-width 3D sphere
   - Expand button overlay (bottom right of sphere)

3. **Bottom Sheet**
   - Collapsed state: Shows title and date
   - Expanded state: Full metadata with scroll
   - Drag handle for expansion
   - Touch/drag to expand on mobile browsers

## Implementation Approach

### Phase 1: Structure
- Create responsive layout containers
- Set up CSS Grid/Flexbox for desktop 3-column layout
- Add mobile breakpoint logic

### Phase 2: Desktop Components
- Top navigation with expandable search
- Minimal filter sidebar
- Updated metadata panel
- Bottom controls (count + expand)

### Phase 3: Mobile Components
- Mobile top bar with filter/search buttons
- Bottom sheet component with drag functionality
- Touch gesture handling

### Phase 4: Interactions
- Search bar expand/collapse animation
- Filter active states and transitions
- Modal for expanded image view
- Bottom sheet drag gestures

### Phase 5: Polish
- Typography consistency (monospace, uppercase)
- Smooth transitions (200ms standard)
- Proper z-indexing for overlays
- Accessibility (keyboard nav, ARIA labels)

## Technical Decisions

### CSS Architecture
- Tailwind for utility classes
- CSS modules for complex components
- CSS variables for theme consistency

### State Management
- React hooks for UI state
- Context for filter/search state
- Ref-based approach for drag gestures

### Responsive Strategy
- Mobile-first approach
- Single breakpoint at 768px
- CSS Grid for desktop, Flexbox for mobile

### Performance
- Debounced search (existing 300ms)
- Memoized filter calculations
- Lazy load modal components
- CSS transforms for animations (GPU acceleration)

## Component Structure

```
app/
  page.tsx           # Main layout orchestration
  
components/
  TopNav.tsx         # Desktop navigation bar
  FilterSidebar.tsx  # Minimal category filters
  MetadataPanel.tsx  # Right sidebar info
  BottomControls.tsx # Results count + expand button
  MobileHeader.tsx   # Mobile filter/search buttons
  BottomSheet.tsx    # Mobile metadata sheet
  ImageModal.tsx     # Full-width image viewer
  InfiniteMenu.tsx   # Existing WebGL component
```

## Design Tokens

```css
/* Colors */
--color-white: #ffffff;
--color-white-60: rgba(255, 255, 255, 0.6);
--color-white-80: rgba(255, 255, 255, 0.8);
--color-black: #000000;
--color-gray: #1a1a1a;

/* Typography */
--font-mono: 'SF Mono', 'Monaco', monospace;
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--tracking-wide: 0.08em;

/* Spacing */
--spacing-unit: 0.5rem;

/* Transitions */
--transition-duration: 200ms;
--transition-easing: cubic-bezier(0.4, 0, 0.2, 1);
```

## Mobile Gestures

### Bottom Sheet Behavior
1. **Initial State**: 80px height showing title
2. **Tap**: Expands to 50% viewport height
3. **Drag Up**: Expands to full height
4. **Drag Down**: Collapses to initial state
5. **Swipe Velocity**: Fast swipe triggers full expand/collapse

### Touch Implementation
```typescript
// Simplified gesture logic
const handleTouchStart = (e) => {
  startY = e.touches[0].clientY;
  startHeight = sheetHeight;
};

const handleTouchMove = (e) => {
  const deltaY = startY - e.touches[0].clientY;
  const newHeight = Math.max(80, Math.min(window.innerHeight, startHeight + deltaY));
  setSheetHeight(newHeight);
};

const handleTouchEnd = (e) => {
  const velocity = calculateVelocity();
  if (velocity > threshold) {
    animateToFullHeight();
  } else if (velocity < -threshold) {
    animateToCollapsed();
  } else {
    snapToNearestState();
  }
};
```

## Accessibility Considerations

1. **Keyboard Navigation**
   - Tab order: Nav → Filters → Sphere → Metadata → Controls
   - Arrow keys for filter navigation
   - Escape to close modal/search

2. **Screen Readers**
   - ARIA labels for all interactive elements
   - Live regions for results count
   - Role attributes for custom components

3. **Focus Management**
   - Visible focus indicators
   - Focus trap in modal
   - Return focus on close

## Performance Optimizations

1. **Code Splitting**
   - Lazy load ImageModal component
   - Defer mobile components on desktop

2. **Animation Performance**
   - Use transform/opacity only
   - will-change for animated elements
   - requestAnimationFrame for drag

3. **Render Optimization**
   - Memoize filter results
   - Virtualize long lists if needed
   - Debounce resize handlers

## Testing Strategy

1. **Unit Tests**
   - Component rendering
   - State management
   - Gesture calculations

2. **Integration Tests**
   - Filter + search interaction
   - Modal open/close flow
   - Bottom sheet drag behavior

3. **E2E Tests**
   - Desktop user flow
   - Mobile user flow
   - Responsive transitions

## Known Limitations

1. **Browser Support**
   - Modern browsers only (Chrome 90+, Firefox 88+, Safari 14+)
   - Touch gestures require native touch events

2. **Performance Constraints**
   - 750+ items may impact mobile performance
   - Complex animations limited on low-end devices

3. **Design Constraints**
   - Fixed breakpoint at 768px (no tablet-specific layout)
   - Bottom sheet requires JavaScript (no CSS-only fallback)