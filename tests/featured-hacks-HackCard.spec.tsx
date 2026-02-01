/**
 * Featured Hacks: type-appropriate CTAs on HackCard
 * - Prompt/skill assets: "Copy Hack" + "View Details"
 * - App assets: only "View Details" (primary)
 * - Stories: "Copy Story" + "View Details"
 * - Fallback (asset, no assetType): "Copy Hack" + "View Details"
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HackCard, type FeaturedHackItem } from '../src/components/dashboard/FeaturedHacks/HackCard'

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const baseHack: FeaturedHackItem = {
  type: 'asset',
  id: 'test-1',
  title: 'Test Hack',
  blurb: 'Test blurb',
  authorName: 'Author',
  reuseCount: 0,
  isRisingStar: false,
  _creationTime: Date.now(),
  assetId: 'asset-1',
}

function renderCard(hack: FeaturedHackItem) {
  return render(
    <MemoryRouter>
      <HackCard hack={hack} />
    </MemoryRouter>
  )
}

describe('HackCard type-appropriate CTAs', () => {
  it('shows Copy Hack + View Details for prompt asset', () => {
    renderCard({ ...baseHack, assetType: 'prompt' })
    expect(screen.getByRole('button', { name: /copy.*clipboard/i })).toHaveTextContent('Copy Hack')
    expect(screen.getByRole('link', { name: /view details/i })).toHaveTextContent('View Details')
  })

  it('shows Copy Hack + View Details for skill asset', () => {
    renderCard({ ...baseHack, assetType: 'skill' })
    expect(screen.getByRole('button', { name: /copy.*clipboard/i })).toHaveTextContent('Copy Hack')
    expect(screen.getByRole('link', { name: /view details/i })).toHaveTextContent('View Details')
  })

  it('shows only View Details for app asset (no Copy button)', () => {
    renderCard({ ...baseHack, assetType: 'app' })
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view details/i })).toHaveTextContent('View Details')
  })

  it('shows Copy Story + View Details for story', () => {
    renderCard({
      ...baseHack,
      type: 'story',
      id: 'story-1',
      storyId: 'story-1',
      assetId: undefined,
    })
    expect(screen.getByRole('button', { name: /copy.*clipboard/i })).toHaveTextContent('Copy Story')
    expect(screen.getByRole('link', { name: /view details/i })).toHaveTextContent('View Details')
  })

  it('fallback: asset with no assetType shows Copy Hack + View Details', () => {
    renderCard({ ...baseHack, assetType: undefined })
    expect(screen.getByRole('button', { name: /copy.*clipboard/i })).toHaveTextContent('Copy Hack')
    expect(screen.getByRole('link', { name: /view details/i })).toHaveTextContent('View Details')
  })
})
