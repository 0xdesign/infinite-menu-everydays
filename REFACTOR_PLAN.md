# Infinite Menu Refactoring Plan with Test-Driven Development

## Executive Summary

This document outlines the comprehensive refactoring strategy for the InfiniteMenu component to support dynamic filtering, search functionality, and pagination while maintaining smooth performance and user experience. The refactoring follows Test-Driven Development (TDD) principles to ensure code quality and user-focused features.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Test-Driven Development Strategy](#test-driven-development-strategy)
4. [Implementation Phases](#implementation-phases)
5. [Performance Benchmarks](#performance-benchmarks)
6. [Migration Strategy](#migration-strategy)

## Current State Analysis

### Existing Implementation
- **Fixed vertex count**: 42 positions on sphere (icosahedron subdivision level 1)
- **Item cycling**: Uses modulo operator for items > 42
- **Filter behavior**: Complete component remount on filter change
- **Performance**: Handles limited items well, but scales poorly
- **User experience**: Loses rotation state on filter changes

### Pain Points
1. Component unmounts/remounts on filter changes
2. No pagination for large datasets
3. WebGL context recreation causes flicker
4. Limited to texture atlas constraints
5. No search functionality preparation

## Proposed Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                     App Component                        │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │  Filter/Search  │  │   InfiniteMenu Component     │  │
│  │      UI         │  │  ┌─────────────────────────┐ │  │
│  └────────┬────────┘  │  │  InfiniteMenuDataManager││  │
│           │           │  │  └───────────┬───────────┘│  │
│           │           │  │              │            │  │
│           │           │  │  ┌───────────▼───────────┐│  │
│           │           │  │  │   InfiniteGridMenu    ││  │
│           └───────────┼──┼─▶│   (WebGL Renderer)    ││  │
│                       │  │  └───────────────────────┘│  │
│                       │  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Classes

#### 1. InfiniteMenuDataManager
Manages data state, filtering, pagination, and search
```typescript
class InfiniteMenuDataManager {
  // Core state
  private allItems: MenuItem[] = [];
  private filteredItems: MenuItem[] = [];
  private displayedItems: MenuItem[] = [];
  
  // Pagination
  private currentPage = 0;
  private itemsPerPage = 200;
  
  // Caching
  private filterCache: Map<string, MenuItem[]>;
  private textureAtlasCache: LRUCache<string, WebGLTexture>;
  
  // Methods
  async loadInitialData(): Promise<void>;
  async applyFilters(filters: FilterOptions): Promise<void>;
  async search(query: string): Promise<void>;
  getItemsForDisplay(): MenuItem[];
  prefetchNextPage(): void;
}
```

#### 2. Enhanced InfiniteGridMenu
WebGL renderer with update capabilities
```typescript
class InfiniteGridMenu {
  // New update method instead of recreation
  updateItems(items: MenuItem[], options?: UpdateOptions): void;
  
  // Transition management
  transitionToNewState(state: MenuState): Promise<void>;
  
  // Performance monitoring
  getPerformanceMetrics(): PerformanceMetrics;
}
```

## Test-Driven Development Strategy

### Testing Stack
```json
{
  "devDependencies": {
    "vitest": "^1.6.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/user-event": "^14.5.0",
    "playwright": "^1.45.0",
    "msw": "^2.3.0",
    "jest-webgl-canvas-mock": "^2.5.0"
  }
}
```

### TDD Workflow

1. **Red Phase**: Write failing test for user behavior
2. **Green Phase**: Write minimal code to pass
3. **Refactor Phase**: Improve code while tests pass

### Test Categories

#### 1. Unit Tests (Vitest)
Focus on individual component behavior

```typescript
// Example: Data Manager Test
describe('InfiniteMenuDataManager', () => {
  it('should load items without blocking UI', async () => {
    const manager = new InfiniteMenuDataManager();
    const loadPromise = manager.loadInitialData();
    
    // Should return immediately
    expect(manager.isLoading).toBe(true);
    
    // Should resolve with items
    await loadPromise;
    expect(manager.getItemsForDisplay()).toHaveLength(42);
  });
  
  it('should preserve rotation when applying filters', async () => {
    const manager = new InfiniteMenuDataManager();
    const initialRotation = { x: 45, y: 30 };
    
    await manager.applyFilters({ category: 'Abstract' });
    
    expect(manager.getRotationState()).toEqual(initialRotation);
  });
});
```

#### 2. Integration Tests (React Testing Library)
Test component interactions

```typescript
describe('InfiniteMenu Integration', () => {
  it('should update items without remounting', async () => {
    const { container } = render(<InfiniteMenu items={mockItems} />);
    const canvas = container.querySelector('canvas');
    const initialCanvas = canvas;
    
    // Apply filter
    await userEvent.click(screen.getByText('Abstract'));
    
    // Canvas should be same instance
    expect(container.querySelector('canvas')).toBe(initialCanvas);
  });
});
```

#### 3. E2E Tests (Playwright)
Complete user journeys

```typescript
test('user can filter and search collection', async ({ page }) => {
  await page.goto('/');
  
  // Initial load
  await expect(page.locator('canvas')).toBeVisible();
  
  // Apply category filter
  await page.click('text=Abstract');
  await page.waitForTimeout(500); // Animation
  
  // Search within category
  await page.fill('[data-testid=search]', 'blue');
  
  // Verify results
  await expect(page.locator('[data-testid=result-count]'))
    .toContainText('Showing 12 items');
});
```

## Implementation Phases

### Phase 0: Testing Setup (Day 1)
- [ ] Install testing dependencies
- [ ] Configure Vitest for React/TypeScript
- [ ] Setup MSW for API mocking
- [ ] Create test utilities

### Phase 1: Core Data Management (Days 2-3)
**TDD Cycle for each feature:**

1. **Write failing tests first:**
```typescript
// ❌ RED: Write test
it('should paginate large datasets', async () => {
  const manager = new InfiniteMenuDataManager();
  await manager.loadItems(5000); // Large dataset
  
  expect(manager.getDisplayedItems()).toHaveLength(200);
  expect(manager.hasMorePages()).toBe(true);
});

// ❌ Test fails (class doesn't exist yet)
```

2. **Implement minimal code:**
```typescript
// ✅ GREEN: Make it pass
class InfiniteMenuDataManager {
  private items: MenuItem[] = [];
  private pageSize = 200;
  
  async loadItems(count: number) {
    this.items = await fetchMockItems(count);
  }
  
  getDisplayedItems() {
    return this.items.slice(0, this.pageSize);
  }
  
  hasMorePages() {
    return this.items.length > this.pageSize;
  }
}
```

3. **Refactor with confidence:**
```typescript
// ♻️ REFACTOR: Improve design
class InfiniteMenuDataManager {
  // Better structure, same behavior
  private state = {
    allItems: [],
    currentPage: 0,
    pageSize: 200
  };
  
  // Extracted methods, better names
  // Tests still pass!
}
```

### Phase 2: Component Refactoring (Days 4-5)
- [ ] Write tests for update behavior
- [ ] Implement `updateItems()` method
- [ ] Test and implement transitions
- [ ] Verify no remounting occurs

### Phase 3: Search Implementation (Days 6-7)
- [ ] Write search behavior tests
- [ ] Implement debounced search
- [ ] Test search + filter combinations
- [ ] Add empty state handling

### Phase 4: Performance Optimization (Days 8-9)
- [ ] Write performance benchmarks
- [ ] Implement texture atlas caching
- [ ] Add memory management
- [ ] Optimize render loops

### Phase 5: Integration & Polish (Day 10)
- [ ] E2E test scenarios
- [ ] Visual regression tests
- [ ] Documentation updates
- [ ] Performance validation

## Performance Benchmarks

### Target Metrics
```typescript
const performanceTargets = {
  initialLoad: 2000,      // ms
  filterSwitch: 300,      // ms
  searchDebounce: 300,    // ms
  frameRate: 60,          // fps
  memoryLimit: 512,       // MB
  maxItems: 10000         // items
};
```

### Benchmark Tests
```typescript
describe('Performance Benchmarks', () => {
  it('should maintain 60fps with 5000 items', async () => {
    const metrics = await measurePerformance(() => {
      // Rotate sphere with 5000 items
    });
    
    expect(metrics.fps).toBeGreaterThanOrEqual(60);
  });
});
```

## Migration Strategy

### Step 1: Parallel Implementation
- Keep existing component working
- Build new architecture alongside
- Test thoroughly with feature flags

### Step 2: Gradual Rollout
```typescript
// Feature flag approach
const InfiniteMenuWrapper = ({ items }) => {
  const useNewArchitecture = process.env.NEXT_PUBLIC_USE_NEW_MENU;
  
  if (useNewArchitecture) {
    return <NewInfiniteMenu items={items} />;
  }
  
  return <LegacyInfiniteMenu items={items} />;
};
```

### Step 3: Validation & Cutover
- A/B test with subset of users
- Monitor performance metrics
- Full cutover after validation
- Remove legacy code

## Success Criteria

### Functional Requirements
- ✓ No component remounting on filter/search
- ✓ Smooth handling of 10,000+ items
- ✓ Search results in < 300ms
- ✓ Rotation state preserved across updates

### Performance Requirements
- ✓ 60fps during rotation
- ✓ < 2s initial load time
- ✓ < 512MB memory usage
- ✓ Smooth transitions between states

### User Experience
- ✓ No visual disruption during updates
- ✓ Intuitive search/filter behavior
- ✓ Clear loading states
- ✓ Graceful error handling

## Appendix: Code Examples

### Example Test Suite Structure
```
__tests__/
├── unit/
│   ├── InfiniteMenuDataManager.test.ts
│   ├── TextureAtlasCache.test.ts
│   └── utils.test.ts
├── integration/
│   ├── InfiniteMenu.test.tsx
│   ├── FilteringBehavior.test.tsx
│   └── SearchFunctionality.test.tsx
├── e2e/
│   ├── userJourneys.spec.ts
│   └── performance.spec.ts
└── setup/
    ├── testSetup.ts
    └── mocks/
        ├── webgl.ts
        └── supabase.ts
```

### Running Tests
```bash
# Unit tests (fast, run often)
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (slower, run before deploy)
npm run test:e2e

# All tests with coverage
npm run test:all
```

This refactoring plan ensures we build a robust, scalable solution while maintaining code quality through Test-Driven Development.