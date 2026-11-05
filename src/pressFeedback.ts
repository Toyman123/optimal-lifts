/** One tap pulse for every enabled control, including keyboard activation. */
export function installPressFeedback(root: Document = document) {
  const pulse = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return
    const control = target.closest('button, a[href], summary, [role="button"]')
    if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest('[inert]')) return
    try { navigator.vibrate?.(8) } catch { /* Feedback must never interrupt an action. */ }
  }
  const click = (event: MouseEvent) => pulse(event.target)
  const keydown = (event: KeyboardEvent) => {
    if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
    const control = event.target instanceof Element ? event.target.closest('[role="button"]') : null
    // Native controls dispatch a click for keyboard activation themselves.
    if (control && !control.matches('button, a[href], summary')) pulse(control)
  }
  root.addEventListener('click', click, true)
  root.addEventListener('keydown', keydown, true)
  return () => {
    root.removeEventListener('click', click, true)
    root.removeEventListener('keydown', keydown, true)
  }
}
