import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GeminiWorkoutEntry } from './GeminiWorkoutEntry'
vi.mock('./cloud', () => ({ getCloudAccessToken: vi.fn(async () => 'test-token') }))
const exercises = [{ id: 'press', name: 'Incline DB Press', aliases: [], bodyweight: false }]
describe('natural-language workout review', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals() })
  async function prepare(body: unknown, onApply = vi.fn()) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(body))))
    render(<GeminiWorkoutEntry exercises={exercises} onApply={onApply} />)
    fireEvent.click(screen.getByText('Describe your workout with Gemini'))
    fireEvent.change(screen.getByLabelText('What did you do?'), { target: { value: 'I did incline press at 70 pounds for 7 reps.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Parse with Gemini' }))
    await screen.findByText('Review before saving')
    return onApply
  }
  it('does not change the workout until the user reviews and applies it', async () => {
    const apply = await prepare({ note: 'Incline DB Press\n70x7', issues: [] })
    expect(apply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use reviewed sets' }))
    expect(apply).toHaveBeenCalledWith('Incline DB Press\n70x7')
  })
  it('blocks applying ambiguous entries', async () => {
    const apply = await prepare({ note: 'Incline DB Press\n70x7', issues: ['Confirm weight for the second set.'] })
    expect((screen.getByRole('button', { name: 'Use reviewed sets' }) as HTMLButtonElement).disabled).toBe(true)
    expect(apply).not.toHaveBeenCalled()
  })
  it('invalidates the preview when the input changes', async () => {
    const apply = await prepare({ note: 'Incline DB Press\n70x7', issues: [] })
    fireEvent.change(screen.getByLabelText('What did you do?'), { target: { value: 'Actually I used 65 pounds.' } })
    await waitFor(() => expect(screen.queryByText('Review before saving')).toBeNull())
    expect(apply).not.toHaveBeenCalled()
  })
})
