# NFT Gallery Mobile Design System

A cohesive design system for the mobile NFT gallery with 3D sphere visualization.

## Design Principles

### 1. **Crypto-Native Aesthetic**
- Monospace typography throughout (`font-mono`)
- ALL CAPS text for interface elements
- Technical, grid-based precision
- Minimal color palette focused on black/white/transparency

### 2. **Premium Glass Morphism**
- Subtle backdrop blur effects
- Layered transparency for depth
- Refined border treatments
- Strategic use of shadows for elevation

### 3. **Purposeful Motion**
- Spring physics for natural feel
- Sub-200ms interaction feedback
- Scaled animations based on context
- Performance-optimized GPU acceleration

## Color System

```css
/* Primary Surfaces */
--glass-bg: rgba(0, 0, 0, 0.8);              /* Primary glass surfaces */
--glass-border: rgba(255, 255, 255, 0.1);     /* Glass borders */
--surface-elevated: rgba(255, 255, 255, 0.05); /* Elevated surfaces */
--surface-interactive: rgba(255, 255, 255, 0.1); /* Interactive elements */
--surface-pressed: rgba(255, 255, 255, 0.2);   /* Pressed states */

/* Text Hierarchy */
text-white                    /* Primary text */
text-white/80                 /* Secondary text */  
text-white/60                 /* Tertiary text */
text-white/40                 /* Disabled/hint text */
text-white/20                 /* Dividers */
```

## Typography

### Font Weights & Usage
- **Font Regular**: Body text, descriptions
- **Font Medium**: Headings, important labels
- **Font Bold**: Call-to-action buttons, emphasis

### Text Sizes & Hierarchy
```css
text-lg    /* 18px - Main headings */
text-sm    /* 14px - Body text, descriptions */
text-xs    /* 12px - Labels, metadata */
```

### Tracking & Spacing
- `tracking-wider` for all interface text
- `tracking-[0.08em]` for fine-tuned spacing
- `uppercase` for all UI elements
- `leading-relaxed` for readable body text

## Component Library

### Glass Surfaces
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
}

.glass-subtle {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

### Interactive States
```css
/* Base interactive element */
.interactive {
  transition: all 0.15s ease;
}

/* Hover states (desktop) */
.interactive:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

/* Touch feedback (mobile) */
@media (hover: none) {
  .touch-feedback:active {
    transform: scale(0.98);
    transition: transform 0.1s ease;
  }
}
```

## Component Specifications

### 1. **Floating Action Buttons (FABs)**
- **Size**: 56px (14 x 14 Tailwind units)
- **Radius**: `rounded-full`
- **Background**: `bg-black/80 backdrop-blur-xl`
- **Border**: `border-white/10 hover:border-white/20`
- **Shadow**: `shadow-2xl`
- **Animation**: `whileTap={{ scale: 0.9 }}`

### 2. **Bottom Sheets**
- **Backdrop**: `bg-black/95 backdrop-blur-xl`
- **Border**: `border-t border-white/10`
- **Radius**: `rounded-t-3xl` (24px)
- **Drag Handle**: `w-12 h-1 bg-white/30 rounded-full`
- **Padding**: `px-6` horizontal, `py-4` vertical

### 3. **Input Fields**
- **Background**: `bg-white/10 focus:bg-white/15`
- **Border**: `border-white/20 focus:border-white/40`
- **Radius**: `rounded-2xl`
- **Padding**: `px-4 py-4` for touch-friendly 44px height
- **Placeholder**: `placeholder-white/40`

### 4. **Buttons**
- **Primary**: `bg-white text-black` with `shadow-lg`
- **Secondary**: `bg-white/10 border border-white/10`
- **Minimum Height**: `py-3` (44px touch target)
- **Radius**: `rounded-2xl`
- **Text**: `uppercase tracking-wider font-medium`

### 5. **Cards & Tags**
- **Category Tags**: `px-3 py-1.5 bg-white/10 rounded-full border border-white/10`
- **Info Cards**: `p-3 bg-white/5 rounded-xl border border-white/10`
- **Metadata Cards**: Glass morphism with subtle shadows

## Animation Guidelines

### Timing & Easing
```javascript
// Framer Motion presets
const springConfig = {
  type: "spring",
  damping: 30,
  stiffness: 300
};

const quickTransition = {
  duration: 0.15,
  ease: "easeOut"
};

const smoothTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1] // Custom easing curve
};
```

### State Transitions
- **Entry animations**: Slide up from bottom, fade in
- **Exit animations**: Slide down, scale down slightly  
- **Loading states**: Gentle rotation, pulsing opacity
- **Success feedback**: Scale up briefly, then return

### Performance Optimizations
- Use `transform` and `opacity` for animations
- Enable GPU acceleration with `will-change: transform`
- Pause off-screen animations
- Debounce scroll-triggered animations

## Icons

### Library: Phosphor React
```bash
npm install phosphor-react
```

### Icon Usage
```jsx
import { MagnifyingGlass, Heart, ShareNetwork } from 'phosphor-react';

// Standard size and weight
<MagnifyingGlass className="w-5 h-5" weight="regular" />

// Contextual weights
weight="light"    // Subtle, secondary actions
weight="regular"  // Default interface icons  
weight="bold"     // Important actions, alerts
weight="fill"     // Active states, selections
```

### Common Icons Mapping
- **Search**: `MagnifyingGlass`
- **Filter**: `Funnel` 
- **Share**: `ShareNetwork`
- **Favorite**: `Heart`
- **External Link**: `Export`
- **Close**: `X`
- **Calendar**: `CalendarBlank`
- **Network**: `Globe`
- **Address**: `Hash`
- **Copy**: `Copy`

## Responsive Behavior

### Touch Targets
- **Minimum size**: 44x44px (iOS/Android standard)
- **Comfortable spacing**: 8px minimum between targets
- **Interactive feedback**: Visual and haptic when possible

### Gestures
- **Drag to dismiss**: Bottom sheets, modals
- **Pull to refresh**: Data lists (when applicable)  
- **Swipe navigation**: Between items or categories
- **Tap outside**: Dismiss overlays and modals

## Accessibility

### Focus Management
```css
.focus-ring:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
}
```

### Screen Reader Support
- Semantic HTML elements
- Proper ARIA labels and roles
- Descriptive button text (not just icons)
- Skip links for complex navigation

### Color Contrast
- All text meets WCAG AA standards (4.5:1 minimum)
- Interactive elements have sufficient contrast
- Focus indicators are clearly visible

## Development Guidelines

### File Organization
```
components/
├── mobile/
│   ├── BottomSheet.tsx       # Modal sheets
│   ├── LoadingState.tsx      # Loading animations
│   ├── EmptyState.tsx        # Empty state handling
│   ├── Toast.tsx             # Notifications
│   └── ...
├── ui/                       # Reusable UI components
└── ...
```

### Component Patterns
1. **Composition over configuration**: Small, focused components
2. **Consistent prop interfaces**: Standard naming conventions
3. **Default props**: Sensible defaults for optional properties
4. **Error boundaries**: Graceful degradation
5. **Loading states**: Always provide feedback

### Performance Considerations
1. **Lazy loading**: Off-screen content
2. **Virtualization**: Large lists of NFTs
3. **Image optimization**: WebP format, responsive sizing
4. **Bundle optimization**: Tree-shaking, code splitting
5. **Caching strategies**: Service workers, API responses

## Future Enhancements

### Phase 2 Features
- [ ] Advanced filtering with date ranges
- [ ] Collection analytics dashboard  
- [ ] Social features (comments, reactions)
- [ ] AR preview capabilities
- [ ] Multi-language support

### Technical Debt
- [ ] Replace react-modal-sheet with custom solution
- [ ] Implement comprehensive error boundaries
- [ ] Add comprehensive TypeScript strict mode
- [ ] Set up automated visual regression testing
- [ ] Performance monitoring and analytics

---

This design system ensures consistency, accessibility, and premium user experience across the entire NFT gallery application.