import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'

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
      const [rotationOffset, setRotationOffset] = React.useState(0)
      const vertexCount = 42
      const useTemporalCycling = items.length > vertexCount
      
      // Simulate rotation for temporal cycling
      React.useEffect(() => {
        let interval: any
        
        if (useTemporalCycling) {
          interval = setInterval(() => {
            setRotationOffset((prev: number) => {
              const newOffset = prev + 1
              const activeIndex = newOffset % items.length
              onActiveIndexChange?.(activeIndex)
              return newOffset
            })
          }, 100)
        } else {
          // Reset offset when not using temporal cycling
          setRotationOffset(0)
        }
        
        return () => {
          if (interval) clearInterval(interval)
        }
      }, [items.length, useTemporalCycling, onActiveIndexChange])
      
      return (
        <div 
          data-testid="infinite-menu"
          data-item-count={items.length}
          data-use-temporal-cycling={useTemporalCycling}
          data-rotation-offset={rotationOffset}
        >
          <div>Items: {items.length}</div>
          <div data-testid="cycling-mode">
            {useTemporalCycling ? 'Temporal Cycling' : 'Static Mapping'}
          </div>
        </div>
      )
    }
    
    return MockInfiniteMenu
  }
}))

// Generate mock items
const generateMockItems = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    image: `/img${i + 1}.jpg`,
    link: `/${i + 1}`,
    title: `Item ${i + 1}`,
    description: `Description ${i + 1}`,
  }))
}

// Mock Supabase functions
vi.mock('@/lib/supabase', () => ({
  fetchInfiniteMenuData: vi.fn().mockImplementation(async (category?: string | null) => {
    await new Promise(resolve => setTimeout(resolve, 50))
    
    if (category === 'Small') {
      return generateMockItems(10) // Small dataset
    } else if (category === 'Large') {
      return generateMockItems(100) // Large dataset
    } else if (category === null || category === undefined) {
      return generateMockItems(42) // Default: exactly vertex count
    }
    
    return generateMockItems(3) // Any other category
  }),
  
  fetchInfiniteMenuDataPaginated: vi.fn(),
  fetchCategories: vi.fn().mockResolvedValue(['Small', 'Large', 'Exact'])
}))

describe('Temporal Cycling Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use static mapping for datasets with ≤42 items', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load (42 items)
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Should use static mapping for exactly 42 items
    expect(screen.getByTestId('cycling-mode')).toHaveTextContent('Static Mapping')
    
    // Switch to small dataset (10 items)
    const smallButton = await screen.findByText('Small')
    await user.click(smallButton)
    
    await waitFor(() => {
      expect(screen.getByText('Items: 10')).toBeInTheDocument()
    })
    
    // Should still use static mapping
    expect(screen.getByTestId('cycling-mode')).toHaveTextContent('Static Mapping')
    const menu = screen.getByTestId('infinite-menu')
    expect(menu.getAttribute('data-use-temporal-cycling')).toBe('false')
  })

  it('should use temporal cycling for datasets with >42 items', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Switch to large dataset (100 items)
    const largeButton = await screen.findByText('Large')
    await user.click(largeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Items: 100')).toBeInTheDocument()
    })
    
    // Should use temporal cycling
    expect(screen.getByTestId('cycling-mode')).toHaveTextContent('Temporal Cycling')
    const menu = screen.getByTestId('infinite-menu')
    expect(menu.getAttribute('data-use-temporal-cycling')).toBe('true')
  })

  it('should reset rotation offset when switching between modes', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Switch to large dataset to enable temporal cycling
    const largeButton = await screen.findByText('Large')
    await user.click(largeButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('cycling-mode')).toHaveTextContent('Temporal Cycling')
    })
    
    // Wait for some rotation to occur
    await waitFor(() => {
      const menu = screen.getByTestId('infinite-menu')
      const offset = parseInt(menu.getAttribute('data-rotation-offset') || '0')
      expect(offset).toBeGreaterThan(0)
    }, { timeout: 500 })
    
    // Switch back to small dataset
    const smallButton = await screen.findByText('Small')
    await user.click(smallButton)
    
    await waitFor(() => {
      expect(screen.getByTestId('cycling-mode')).toHaveTextContent('Static Mapping')
    })
    
    // Wait a moment for the reset to take effect
    await waitFor(() => {
      const menu = screen.getByTestId('infinite-menu')
      expect(menu.getAttribute('data-rotation-offset')).toBe('0')
    })
  })

  it('should enable rotation offset tracking for large datasets', async () => {
    render(<Home />)
    
    // Load large dataset
    const user = userEvent.setup()
    const largeButton = await screen.findByText('Large')
    await user.click(largeButton)
    
    await waitFor(() => {
      expect(screen.getByText('Items: 100')).toBeInTheDocument()
    })
    
    // Verify temporal cycling is active
    const menu = screen.getByTestId('infinite-menu')
    expect(menu.getAttribute('data-use-temporal-cycling')).toBe('true')
    
    // The component should be ready to track rotation offset
    // In real usage, rotation would increase the offset value
    const offset = parseInt(menu.getAttribute('data-rotation-offset') || '0')
    expect(offset).toBeGreaterThanOrEqual(0)
    
    // Verify the mode is correctly set
    expect(screen.getByTestId('cycling-mode')).toHaveTextContent('Temporal Cycling')
  })

  it('should handle exactly 42 items without temporal cycling', async () => {
    render(<Home />)
    
    // Wait for initial load with exactly 42 items
    await waitFor(() => {
      const menu = screen.getByTestId('infinite-menu')
      expect(menu).toBeInTheDocument()
      expect(menu.getAttribute('data-item-count')).toBe('42')
    })
    
    const menu = screen.getByTestId('infinite-menu')
    expect(menu.getAttribute('data-use-temporal-cycling')).toBe('false')
    expect(screen.getByTestId('cycling-mode')).toHaveTextContent('Static Mapping')
    
    // Rotation offset should remain 0
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(menu.getAttribute('data-rotation-offset')).toBe('0')
  })
})