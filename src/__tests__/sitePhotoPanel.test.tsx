// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import { useSitePhotoStore } from '@/stores/sitePhotoStore'
import { SitePhotoPanel } from '@/components/offline/SitePhotoPanel'

const PID = 'p-site-photos'

beforeEach(async () => {
  await db.sitePhotos.clear()
  useSitePhotoStore.setState({ photos: [], currentProjectId: null, isLoading: false })
})

afterEach(() => {
  cleanup()
})

describe('SitePhotoPanel', () => {
  it('shows the empty state before any capture', async () => {
    render(<SitePhotoPanel projectId={PID} />)
    expect(await screen.findByText('No site photos yet.')).toBeTruthy()
    expect(screen.getByText('Photos are stored locally and work fully offline.')).toBeTruthy()
    expect(screen.getByText('0 photos')).toBeTruthy()
    cleanup()
  })

  it('captures a file, reads it to a data URL, and stores it offline', async () => {
    render(<SitePhotoPanel projectId={PID} />)
    const input = screen.getByTestId('photo-input')
    const file = new File(['data'], 'slab.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(useSitePhotoStore.getState().photos).toHaveLength(1))
    expect(await db.sitePhotos.count()).toBe(1)
    const photo = useSitePhotoStore.getState().photos[0]
    expect(photo.dataUrl).toContain('data:image/jpeg')
    expect(photo.source).toBe('capture')
    expect(await screen.findByText('stored offline')).toBeTruthy()
    expect(screen.getByText('1 photos')).toBeTruthy()
    cleanup()
  })

  it('rejects non-image files with an error and stores nothing', async () => {
    render(<SitePhotoPanel projectId={PID} />)
    const input = screen.getByTestId('photo-input')
    const bad = new File(['x'], 'notes.txt', { type: 'text/plain' })
    fireEvent.change(input, { target: { files: [bad] } })
    await screen.findByText(/Only image files can be stored/)
    expect(await db.sitePhotos.count()).toBe(0)
    cleanup()
  })

  it('geo-tags a capture when latitude and longitude are entered', async () => {
    render(<SitePhotoPanel projectId={PID} />)
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '-17.8292' } })
    fireEvent.change(screen.getByLabelText('Longitude'), { target: { value: '31.0522' } })
    const input = screen.getByTestId('photo-input')
    const file = new File(['data'], 'site.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(useSitePhotoStore.getState().photos).toHaveLength(1))
    const photo = useSitePhotoStore.getState().photos[0]
    expect(photo.geo).toEqual({ lat: -17.8292, lng: 31.0522 })
    expect(await screen.findByText('-17.8292, 31.0522')).toBeTruthy()
    expect(screen.getByText('1 geo-tagged')).toBeTruthy()
    cleanup()
  })

  it('deletes a photo from the grid and Dexie', async () => {
    const { addPhoto } = useSitePhotoStore.getState()
    await addPhoto({ projectId: PID, dataUrl: 'data:image/jpeg;base64,AAAA', note: 'slab pour' })
    render(<SitePhotoPanel projectId={PID} />)
    expect(await screen.findByText('slab pour')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Delete slab pour'))
    await waitFor(() => expect(useSitePhotoStore.getState().photos).toHaveLength(0))
    expect(await db.sitePhotos.count()).toBe(0)
    cleanup()
  })

  it('isolation guard: does not blow up when FileReader is mocked away', async () => {
    // Guard against the toDataUrl rejection path leaving partial state.
    render(<SitePhotoPanel projectId={PID} />)
    expect(await screen.findByText('No site photos yet.')).toBeTruthy()
    cleanup()
  })
})

describe('SitePhotoPanel — edit note flow', () => {
  it('persists an edited note on blur', async () => {
    const { addPhoto } = useSitePhotoStore.getState()
    await addPhoto({ projectId: PID, dataUrl: 'data:image/jpeg;base64,AAAA', note: 'initial' })
    render(<SitePhotoPanel projectId={PID} />)
    await screen.findByText('initial')
    const input = screen.getByPlaceholderText('Edit note')
    fireEvent.change(input, { target: { value: 'revised' } })
    fireEvent.blur(input)
    await waitFor(() => expect(useSitePhotoStore.getState().photos[0].note).toBe('revised'))
    const fromDb = await db.sitePhotos.get(useSitePhotoStore.getState().photos[0].id)
    expect(fromDb?.note).toBe('revised')
    cleanup()
  })
})
