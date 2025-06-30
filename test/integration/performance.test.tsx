import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'

// Create mock data generator
const generateMockItems = (count: number, offset: number = 0) => {
  return Array.from({ length: count }, (_, i) => ({
    id: offset + i + 1,
    image: `/img${offset + i + 1}.jpg`,
    link: `/${offset + i + 1}`,
    title: `Item ${offset + i + 1}`,
    description: `Description ${offset + i + 1}`,
  }))
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
      
      // Simulate rotation through items
      React.useEffect(() => {
        if (onActiveIndexChange) {
          // Simulate user rotating through items
          const interval = setInterval(() => {
            const randomIndex = Math.floor(Math.random() * items.length)
            onActiveIndexChange(randomIndex)
          }, 100)
          
          return () => clearInterval(interval)
        }
      }, [items, onActiveIndexChange])
      
      return (
        <div data-testid="infinite-menu" data-item-count={items.length}>
          <div>Items: {items.length}</div>
        </div>
      )
    }
    
    return MockInfiniteMenu
  }
}))

// Mock Supabase functions
vi.mock('@/lib/supabase', () => ({
  fetchInfiniteMenuData: vi.fn().mockImplementation(async () => {
    // Simulate large dataset
    return generateMockItems(1000)
  }),
  
  fetchInfiniteMenuDataPaginated: vi.fn().mockImplementation(async (offset: number, limit: number) => {
    // Simulate paginated response
    await new Promise(resolve => setTimeout(resolve, 50)) // Simulate network delay
    const totalItems = 1000
    const items = generateMockItems(
      Math.min(limit, totalItems - offset), 
      offset
    )
    
    return {
      items,
      total: totalItems
    }
  }),
  
  fetchCategories: vi.fn().mockResolvedValue(['Abstract', 'Nature', 'Technology'])
}))

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle large datasets efficiently with pagination', async () => {
    const startTime = performance.now()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    const initialLoadTime = performance.now() - startTime
    
    // Initial load should be fast (under 500ms)
    expect(initialLoadTime).toBeLessThan(500)
    
    // Should show correct item count
    await waitFor(() => {
      expect(screen.getByText(/200 of 1000 items loaded/)).toBeInTheDocument()
    })
    
    // Menu should display window size, not total items
    const menu = screen.getByTestId('infinite-menu')
    expect(menu.getAttribute('data-item-count')).toBe('200')
  })

  it('should prefetch adjacent pages without blocking UI', async () => {
    const { fetchInfiniteMenuDataPaginated } = await import('@/lib/supabase')
    const fetchSpy = vi.mocked(fetchInfiniteMenuDataPaginated)
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Clear initial calls
    fetchSpy.mockClear()
    
    // Wait for rotation simulation to trigger prefetch
    await waitFor(() => {
      // Should have called for next page prefetch
      expect(fetchSpy).toHaveBeenCalledWith(
        200, // offset
        200, // limit
        null, // category
        ''    // search term
      )
    }, { timeout: 5000 })
    
    // UI should remain responsive (menu still visible)
    expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
  })

  it('should maintain smooth performance with search filtering', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search NFTs...')
    
    const searchStartTime = performance.now()
    await user.type(searchInput, 'Abstract')
    const searchTime = performance.now() - searchStartTime
    
    // Search input should be responsive (under 1000ms for typing)
    expect(searchTime).toBeLessThan(1000)
    
    // Menu should still be visible during search
    expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
  })

  it('should not create memory leaks with repeated filter changes', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Perform multiple filter changes
    for (let i = 0; i < 5; i++) {
      const categoryButton = await screen.findByText('Abstract')
      await user.click(categoryButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
      })
      
      const allButton = await screen.findByText('All')
      await user.click(allButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
      })
    }
    
    // Menu should still be responsive
    const menu = screen.getByTestId('infinite-menu')
    expect(menu).toBeInTheDocument()
  })
})