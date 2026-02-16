import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('HackCard', () => {
  it('renders prompt asset as a clickable details card', async () => {
    renderCard({ ...baseHack, assetType: 'prompt' })
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: /view details for test hack/i })).toBeInTheDocument()
    expect(screen.getByText('Prompt')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view details for test hack/i }))
  })

  it('renders skill asset as a clickable details card', async () => {
    renderCard({ ...baseHack, assetType: 'skill' })
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: /view details for test hack/i })).toBeInTheDocument()
    expect(screen.getByText('Skill')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view details for test hack/i }))
  })

  it('renders app asset as a clickable details card with no copy CTA', async () => {
    renderCard({ ...baseHack, assetType: 'app' })
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: /view details for test hack/i })).toBeInTheDocument()
    expect(screen.getByText('App')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /view details/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view details for test hack/i }))
  })

  it('renders story as a clickable details card', async () => {
    renderCard({
      ...baseHack,
      type: 'story',
      id: 'story-1',
      storyId: 'story-1',
      assetId: undefined,
    })
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: /view details for test hack/i })).toBeInTheDocument()
    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view details for test hack/i }))
  })

  it('fallback: asset with no assetType uses story label and clickable details card', async () => {
    renderCard({ ...baseHack, assetType: undefined })
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: /view details for test hack/i })).toBeInTheDocument()
    expect(screen.getByText('Story')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /view details for test hack/i }))
  })
})
