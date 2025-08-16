# Design Patterns

## Typography Guidelines

### Clickable Text Buttons
All clickable text-based buttons should follow these patterns:

1. **Text Casing**: Always use UPPERCASE for clickable text buttons
   - Rationale: Creates clear visual distinction between interactive and static text
   - Implementation: `text-transform: uppercase` or `className="uppercase"`

2. **Letter Spacing**: Apply subtle letter-spacing for improved readability
   - Active state: `tracking-[0.08em]` 
   - Inactive state: `tracking-normal` or `tracking-[0.05em]`

3. **Font Weight**: Use consistent font-weight
   - All states: `font-normal` (monospace fonts have limited weight variations)

4. **Active Indicators**: Use minimal geometric indicators
   - Horizontal line: 16px width, 1px height
   - Position: Left-aligned or inline with text
   - Color: Pure white for active, transparent for inactive

### Example Implementation
```tsx
<button className="uppercase font-mono text-xs tracking-[0.08em]">
  BUTTON TEXT
</button>
```

## Color System

### Interactive States
- **Active**: `text-white` (100% opacity)
- **Inactive**: `text-white/40` (40% opacity)
- **Hover**: `text-white/70` (70% opacity)
- **Disabled**: `text-white/20` (20% opacity)

### Visual Hierarchy
1. Primary actions: Full white
2. Secondary actions: 40-60% white
3. Tertiary/contextual: 30-40% white
4. Labels/metadata: 20-30% white

## Spacing System

### Vertical Rhythm
- Minimal spacing: `space-y-1` (4px)
- Standard spacing: `space-y-2` (8px)
- Section spacing: `space-y-4` (16px)

### Button Padding
- Compact: `py-1.5 px-1` (6px vertical, 4px horizontal)
- Standard: `py-2 px-2` (8px vertical, 8px horizontal)
- Comfortable: `py-3 px-3` (12px vertical, 12px horizontal)

## Animation Guidelines

### Transitions
- Fast interactions: `duration-150` (150ms)
- Standard transitions: `duration-200` (200ms)
- Smooth transitions: `duration-300` (300ms)

### Easing
- Default: `transition-all` (ease function)
- Emphasis: `ease-out`
- De-emphasis: `ease-in`