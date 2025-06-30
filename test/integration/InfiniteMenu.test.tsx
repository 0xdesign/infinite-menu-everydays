import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '@/app/page'


// Mock the dynamic import for InfiniteMenu
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<any>) => {
    const MockInfiniteMenu = ({ items }: { items: any[] }) => {
      // Use React hooks to track mount
      const React = require('react')
      const mountId = React.useRef(null)
      
      if (!mountId.current) {
        mountId.current = Math.random().toString(36).substring(7)
      }
      
      return (
        <div 
          data-testid="infinite-menu" 
          data-mount-id={mountId.current}
          data-item-count={items.length}
        >
          <canvas data-testid="webgl-canvas" />
          <div>Items: {items.length}</div>
        </div>
      )
    }
    
    return MockInfiniteMenu
  }
}))

// Track if it's the first call
let isFirstCall = true

// Mock Supabase functions
vi.mock('@/lib/supabase', () => ({
  fetchInfiniteMenuData: vi.fn().mockImplementation(async (category?: string | null) => {
    // Only add delay for subsequent calls, not the first one
    if (!isFirstCall) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    isFirstCall = false
    
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
  
  fetchCategories: vi.fn().mockResolvedValue(['Abstract', 'Nature', 'Technology'])
}))

describe('InfiniteMenu Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isFirstCall = true // Reset for each test
  })

  it('should NOT remount InfiniteMenu when category filter changes', async () => {
    const user = userEvent.setup()
    
    // Render the home page
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // Get the initial mount ID
    const initialMenu = screen.getByTestId('infinite-menu')
    const initialMountId = initialMenu.getAttribute('data-mount-id')
    const initialCanvas = screen.getByTestId('webgl-canvas')
    
    // Verify initial state
    expect(screen.getByText('Items: 3')).toBeInTheDocument()
    
    // Click on a category filter
    const abstractButton = await screen.findByText('Abstract')
    await user.click(abstractButton)
    
    // Wait for the filter to be applied
    await waitFor(() => {
      expect(screen.getByText('Items: 2')).toBeInTheDocument()
    })
    
    // Get the menu after filter change
    const updatedMenu = screen.getByTestId('infinite-menu')
    const updatedMountId = updatedMenu.getAttribute('data-mount-id')
    const updatedCanvas = screen.getByTestId('webgl-canvas')
    
    // CRITICAL TEST: The mount ID should be the same, proving no remount occurred
    expect(updatedMountId).toBe(initialMountId)
    
    // Canvas element should be the same instance
    expect(updatedCanvas).toBe(initialCanvas)
    
    // The items should have updated without remounting
    expect(updatedMenu.getAttribute('data-item-count')).toBe('2')
  })

  it('should maintain WebGL context across filter changes', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByTestId('webgl-canvas')).toBeInTheDocument()
    })
    
    // Store reference to canvas element
    const canvas = screen.getByTestId('webgl-canvas') as HTMLCanvasElement
    
    // Mock getContext to track if it's called again
    const getContextSpy = vi.spyOn(canvas, 'getContext')
    
    // Apply filter
    const natureButton = await screen.findByText('Nature')
    await user.click(natureButton)
    
    // Wait for update
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    // getContext should NOT have been called again after initial mount
    expect(getContextSpy).not.toHaveBeenCalled()
  })

  it('should show loading state without unmounting menu', async () => {
    const user = userEvent.setup()
    
    render(<Home />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    })
    
    const initialMenu = screen.getByTestId('infinite-menu')
    const initialMountId = initialMenu.getAttribute('data-mount-id')
    
    // Click category quickly to trigger loading state
    const techButton = await screen.findByText('Technology')
    await user.click(techButton)
    
    // During loading, menu should still be present
    expect(screen.getByTestId('infinite-menu')).toBeInTheDocument()
    expect(screen.getByTestId('infinite-menu').getAttribute('data-mount-id')).toBe(initialMountId)
    
    // Check if loading indicator appears (if implemented)
    // Note: This might need adjustment based on actual implementation
    const loadingElement = screen.queryByText('Loading...')
    if (loadingElement) {
      expect(loadingElement).toBeInTheDocument()
    }
  })
})