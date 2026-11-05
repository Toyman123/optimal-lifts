import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installPressFeedback } from './pressFeedback'

const vibrate = vi.fn()
let remove: () => void
let previous: PropertyDescriptor | undefined
beforeEach(() => {
  previous = Object.getOwnPropertyDescriptor(navigator, 'vibrate')
  Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate })
  vibrate.mockClear()
  remove = installPressFeedback()
})
afterEach(() => {
  remove()
  document.body.replaceChildren()
  if (previous) Object.defineProperty(navigator, 'vibrate', previous)
  else Reflect.deleteProperty(navigator, 'vibrate')
})

describe('shared press feedback', () => {
  it('covers newly rendered controls, nested icons, links, and summaries with one pulse per click', () => {
    document.body.innerHTML = '<button><span>Icon</span></button><a href="#notes">Notes</a><details><summary>Options</summary></details>'
    for (const target of document.querySelectorAll('button span, a, summary')) target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(vibrate.mock.calls).toEqual([[8], [8], [8]])
  })
  it('skips disabled controls and gives keyboard-operated custom buttons the same pulse', () => {
    document.body.innerHTML = '<button disabled>Disabled</button><button aria-disabled="true">Unavailable</button><div role="button" tabindex="0">Chart point</div><button id="native">Save</button>'
    for (const target of document.querySelectorAll('button')) target.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(vibrate).toHaveBeenCalledTimes(1)
    document.querySelector('[role="button"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    document.querySelector('#native')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(vibrate).toHaveBeenCalledTimes(2)
  })
  it('does not interrupt actions when vibration is unavailable or throws and removes listeners cleanly', () => {
    const action = vi.fn()
    const button = document.createElement('button')
    button.addEventListener('click', action)
    document.body.append(button)
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: undefined })
    button.click()
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { throw new Error('Unsupported') } })
    button.click()
    expect(action).toHaveBeenCalledTimes(2)
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate })
    remove()
    button.click()
    expect(vibrate).not.toHaveBeenCalled()
  })
})
