import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'

// Mock texture transition tracking
let textureTransitionState = {
  isTransitioning: false,
  blendValue: 0,
  transitionCount: 0
}

// Mock the dynamic import for InfiniteMenu
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<any>) => {
    const MockInfiniteMenu = ({ 
      items,
      onActiveIndexChange 
    }: { 
      items: any[],
      onActiveIndexChange?: (index: number) => void 
    }) => {
      const React = require('react')
      
      // Simulate texture transition when items change
      React.useEffect(() => {
        if (items.length > 0) {
          // Start transition
          textureTransitionState.isTransitioning = true
          textureTransitionState.blendValue = 0
          textureTransitionState.transitionCount++
          
          // Simulate transition progress
          const startTime = Date.now()
          const duration = 500
          
          const updateBlend = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(1, elapsed / duration)
            textureTransitionState.blendValue = progress
            
            if (progress < 1) {
              requestAnimationFrame(updateBlend)
            } else {
              textureTransitionState.isTransitioning = false
            }
          }
          
          requestAnimationFrame(updateBlend)
        }
      }, [items])
      
      return (
        <div 
          data-testid="infinite-menu" 
          data-item-count={items.length}
          data-is-transitioning={textureTransitionState.isTransitioning}
          data-blend-value={textureTransitionState.blendValue}
          data-transition-count={textureTransitionState.transitionCount}
        >
          <div>Items: {items.length}</div>
          <div data-testid="transition-state">
            {textureTransitionState.isTransitioning ? 'Transitioning' : 'Stable'}
          </div>
        </div>
      )
    }
    
    return MockInfiniteMenu
  }
}))

// Mock Supabase functions
vi.mock('@/lib/supabase', () => ({
  fetchInfiniteMenuData: vi.fn().mockImplementation(async (category?: string | null) => {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    if (category === 'Abstract') {
      return [
        { id: 1, image: '/img1.jpg', link: '/1', title: 'Abstract 1', description: 'Desc 1' },
        { id: 2, image: '/img2.jpg', link: '/2', title: 'Abstract 2', description: 'Desc 2' },
      ]
    }
    
    return [
      { id: 1, image: '/img1.jpg', link: '/1', title: 'Item 1', description: 'Desc 1' },
      { id: 2, image: '/img2.jpg', link: '/2', title: 'Item 2', description: 'Desc 2' },
      { id: 3, image: '/img3.jpg', link: '/3', title: 'Item 3', description: 'Desc 3' },
    ]
  }),
  
  fetchInfiniteMenuDataPaginated: vi.fn(),
  fetchCategories: vi.fn().mockResolvedValue(['Abstract', 'Nature', 'Technology'])
}))

describe('Texture Transition Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset transition state
    textureTransitionState = {
      isTransitioning: false,
      blendValue: 0,
      transitionCount: 0
    }
  })

  it('should smoothly transition textures when items change', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Initial state should be stable
    expect(screen.getByTestId('transition-state')).toHaveTextContent('Stable')
    const initialTransitionCount = textureTransitionState.transitionCount
    
    // Click on a category filter
    const abstractButton = await screen.findByText('Abstract')
    await user.click(abstractButton)
    
    // Should start transitioning
    await waitFor(() => {
      const menu = screen.getByTestId('infinite-menu')
      expect(menu.getAttribute('data-is-transitioning')).toBe('true')
    })
    
    // Transition count should increase
    expect(textureTransitionState.transitionCount).toBe(initialTransitionCount + 1)
    
    // Wait for transition to complete
    await waitFor(() => {
      expect(screen.getByTestId('transition-state')).toHaveTextContent('Stable')
    }, { timeout: 1000 })
    
    // Blend value should have reached 1
    const menu = screen.getByTestId('infinite-menu')
    expect(parseFloat(menu.getAttribute('data-blend-value') || '0')).toBeCloseTo(1, 1)
  })

  it('should maintain visual continuity during texture updates', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Capture blend values during transition
    const blendValues: number[] = []
    
    // Click filter to trigger transition
    const natureButton = await screen.findByText('Nature')
    await user.click(natureButton)
    
    // Monitor blend progression
    const checkBlend = async () => {
      const menu = screen.getByTestId('infinite-menu')
      const blendValue = parseFloat(menu.getAttribute('data-blend-value') || '0')
      blendValues.push(blendValue)
      
      if (menu.getAttribute('data-is-transitioning') === 'true') {
        await new Promise(resolve => setTimeout(resolve, 50))
        await checkBlend()
      }
    }
    
    await checkBlend()
    
    // Verify smooth progression
    expect(blendValues.length).toBeGreaterThan(2)
    expect(blendValues[0]).toBeLessThan(0.5)
    expect(blendValues[blendValues.length - 1]).toBeCloseTo(1, 1)
    
    // Check that blend values are monotonically increasing
    for (let i = 1; i < blendValues.length; i++) {
      expect(blendValues[i]).toBeGreaterThanOrEqual(blendValues[i - 1])
    }
  })

  it('should not start new transition while one is in progress', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Start first transition
    const abstractButton = await screen.findByText('Abstract')
    await user.click(abstractButton)
    
    // Wait for transition to start
    await waitFor(() => {
      const menu = screen.getByTestId('infinite-menu')
      expect(menu.getAttribute('data-is-transitioning')).toBe('true')
    })
    
    const transitionCountDuringFirst = textureTransitionState.transitionCount
    
    // Try to start another transition while first is in progress
    const natureButton = await screen.findByText('Nature')
    await user.click(natureButton)
    
    // Give it a moment to potentially start (it shouldn't)
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Transition count should not have increased
    expect(textureTransitionState.transitionCount).toBe(transitionCountDuringFirst)
  })
})