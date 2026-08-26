const ZOOM_THRESHOLD = 1.05
const REVEAL_FAILSAFE_MS = 3000
const SCROLL_TOLERANCE = 6
const LOGO_RATIO = 3956 / 1218
const NAV_FADE_BAND = 70
const NAV_LIGHT = 255
const NAV_DARK = 30

let lenisInstance = null

export const getLenis = () => lenisInstance

const lerp = (a, b, t) => a + (b - a) * t

export function initSmoothScroll(Lenis) {
  let lenis = null
  let frameId = 0

  const observer = new ResizeObserver(() => {
    if (lenis) lenis.resize()
  })

  const start = () => {
    if (lenis) return
    lenis = new Lenis({
      duration: 1.8,
      wheelMultiplier: 0.9,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
    observer.observe(document.body)
    lenisInstance = lenis
  }

  const stop = () => {
    if (!lenis) return
    observer.disconnect()
    lenis.destroy()
    lenis = null
    lenisInstance = null
  }

  const viewport = window.visualViewport

  const sync = () => {
    if (viewport && viewport.scale > ZOOM_THRESHOLD) stop()
    else start()
  }

  const raf = (time) => {
    if (lenis) lenis.raf(time)
    frameId = requestAnimationFrame(raf)
  }

  sync()
  if (viewport) viewport.addEventListener('resize', sync)
  frameId = requestAnimationFrame(raf)

  return () => {
    if (viewport) viewport.removeEventListener('resize', sync)
    cancelAnimationFrame(frameId)
    stop()
  }
}

export function initReveals(root = document) {
  const targets = root.querySelectorAll('.reveal-mask:not([data-reveal-bound])')

  targets.forEach((el) => {
    el.setAttribute('data-reveal-bound', '')

    const index = Number(el.dataset.revealIndex || 0)
    const delay =
      el.dataset.revealDelay !== undefined ? Number(el.dataset.revealDelay) : index * 0.12
    const duration =
      el.dataset.revealDuration !== undefined ? Number(el.dataset.revealDuration) : 1.4

    const inner = el.querySelector('.reveal-inner')
    if (inner) {
      inner.style.setProperty('--reveal-delay', delay + 's')
      inner.style.setProperty('--reveal-duration', duration + 's')
    }

    const show = () => el.classList.add('is-revealed')

    if (typeof IntersectionObserver === 'undefined') {
      show()
      return
    }

    let failsafe = 0

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          show()
          observer.disconnect()
          window.clearTimeout(failsafe)
        }
      },
      { threshold: 0.15 },
    )

    observer.observe(el)

    const rect = el.getBoundingClientRect()
    const startsInView = rect.top < window.innerHeight && rect.bottom > 0

    if (startsInView) {
      failsafe = window.setTimeout(() => {
        show()
        observer.disconnect()
      }, REVEAL_FAILSAFE_MS)
    }
  })
}

export function initParallax(frame, image, options = {}) {
  const { speed = 0.22, pinned = false, smoothing = 0.12 } = options
  if (!frame || !image) return () => {}
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  let raf = 0
  let running = false
  let current = 0
  let target = 0

  const measure = () => {
    const rect = frame.getBoundingClientRect()
    const viewport = window.innerHeight

    if (pinned) {
      let documentTop = 0
      let node = frame
      while (node) {
        documentTop += node.offsetTop
        node = node.offsetParent
      }

      const travelled = window.scrollY - documentTop
      const progress = Math.min(Math.max(travelled / rect.height, 0), 1)
      target = -progress * rect.height * speed
      return
    }

    const raw = (viewport - rect.top) / (viewport + rect.height)
    const progress = Math.min(Math.max(raw, 0), 1)
    target = (progress - 0.5) * rect.height * speed
  }

  const paint = () => {
    image.style.transform = 'translate3d(0, ' + current.toFixed(2) + 'px, 0)'
  }

  const tick = () => {
    const delta = target - current

    if (Math.abs(delta) < 0.05) {
      current = target
      paint()
      running = false
      raf = 0
      return
    }

    current += delta * smoothing
    paint()
    raf = requestAnimationFrame(tick)
  }

  const start = () => {
    if (running) return
    running = true
    raf = requestAnimationFrame(tick)
  }

  const onScroll = () => {
    measure()
    start()
  }

  measure()
  current = target
  paint()

  const observer = new ResizeObserver(() => {
    measure()
    current = target
    paint()
  })
  observer.observe(frame)

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)

  return () => {
    if (raf) cancelAnimationFrame(raf)
    observer.disconnect()
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  }
}

const BLANK_CURSOR =
  'url("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7") 0 0, none'

const HOVER_SELECTOR =
  'a, button, [role="button"], input, textarea, select, label, summary, [tabindex]'

export function initCursor() {
  const styles = getComputedStyle(document.documentElement)
  const BASE_COLOR = styles.getPropertyValue('--color-sage').trim()
  const HOVER_COLOR = styles.getPropertyValue('--color-sage-dark').trim()
  const BASE_SIZE = 10
  const HOVER_SIZE = 20

  const el = document.createElement('div')
  el.className = 'cursor-dot'
  document.body.appendChild(el)

  const root = document.documentElement
  root.classList.add('bd-cursor-ready')
  root.style.setProperty('cursor', BLANK_CURSOR, 'important')
  requestAnimationFrame(() => root.style.removeProperty('cursor'))

  const target = { x: -100, y: -100 }

  const handleMove = (e) => {
    target.x = e.clientX
    target.y = e.clientY
    el.style.opacity = '1'
  }

  const handleOver = (e) => {
    const hit = e.target && e.target.closest && e.target.closest(HOVER_SELECTOR)
    const size = hit ? HOVER_SIZE : BASE_SIZE
    el.style.width = size + 'px'
    el.style.height = size + 'px'
    el.style.marginLeft = -size / 2 + 'px'
    el.style.marginTop = -size / 2 + 'px'
    el.style.backgroundColor = hit ? HOVER_COLOR : BASE_COLOR
  }

  const handleLeave = () => {
    el.style.opacity = '0'
  }

  window.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseover', handleOver)
  document.addEventListener('mouseleave', handleLeave)

  let lastX = null
  let lastY = null
  let frame = requestAnimationFrame(function tick() {
    if (target.x !== lastX || target.y !== lastY) {
      lastX = target.x
      lastY = target.y
      el.style.transform = 'translate3d(' + target.x + 'px, ' + target.y + 'px, 0)'
    }
    frame = requestAnimationFrame(tick)
  })

  return () => {
    window.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseover', handleOver)
    document.removeEventListener('mouseleave', handleLeave)
    cancelAnimationFrame(frame)
    el.remove()
  }
}

export function initVisualZoom() {
  const viewport = window.visualViewport
  if (!viewport) return () => {}

  const sync = () => {
    document.documentElement.classList.toggle('is-zoomed', viewport.scale > ZOOM_THRESHOLD)
  }

  sync()
  viewport.addEventListener('resize', sync)

  return () => viewport.removeEventListener('resize', sync)
}

const setNavTone = (t) => {
  const channel = Math.round(lerp(NAV_LIGHT, NAV_DARK, t))
  document.documentElement.style.setProperty(
    '--nav-color',
    'rgb(' + channel + ', ' + channel + ', ' + channel + ')',
  )
}

export function initScrollLogo() {
  const box = document.querySelector('[data-bd-scroll-logo]')
  const light = document.querySelector('[data-bd-logo-light]')
  const dark = document.querySelector('[data-bd-logo-dark]')
  if (!box || !light || !dark) return () => {}

  let frame = 0
  let headerSlot = document.querySelector('[data-logo-slot="header"]')
  let cover = document.querySelector('[data-hero-cover]')
  let lastTone = -1
  let lastKey = ''

  const tick = () => {
    if (!headerSlot) {
      headerSlot = document.querySelector('[data-logo-slot="header"]')
    }

    if (!headerSlot) {
      box.style.opacity = '0'
      setNavTone(1)
      frame = requestAnimationFrame(tick)
      return
    }

    const headerRect = headerSlot.getBoundingClientRect()
    let tone = 1

    if (cover) {
      const coverTop = cover.getBoundingClientRect().top
      const overlap = (headerRect.bottom + NAV_FADE_BAND - coverTop) / NAV_FADE_BAND
      tone = Math.min(Math.max(overlap, 0), 1)
    }

    if (tone !== lastTone) {
      lastTone = tone
      setNavTone(tone)
      light.style.opacity = String(1 - tone)
      dark.style.opacity = String(tone)
    }

    const key = headerRect.width + ':' + headerRect.left + ':' + headerRect.top
    if (key !== lastKey) {
      lastKey = key
      box.style.opacity = '1'
      box.style.width = headerRect.width + 'px'
      box.style.height = headerRect.width / LOGO_RATIO + 'px'
      box.style.transform =
        'translate3d(' + headerRect.left + 'px, ' + headerRect.top + 'px, 0)'
    }

    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

export function initHeader() {
  const header = document.querySelector('[data-bd-header]')
  const toggle = document.querySelector('[data-bd-menu-toggle]')
  const label = document.querySelector('[data-bd-menu-label]')
  const dropdown = document.querySelector('[data-bd-dropdown]')
  const backdrop = document.querySelector('[data-bd-backdrop]')
  if (!header || !toggle || !dropdown || !backdrop) return () => {}

  let open = false
  let hidden = false

  const paint = () => {
    header.classList.toggle('is-hidden', hidden && !open)
    dropdown.classList.toggle('is-open', open)
    backdrop.classList.toggle('is-open', open)
    toggle.setAttribute('aria-expanded', String(open))
    if (label) label.textContent = open ? 'Close' : 'Menu'
  }

  const setOpen = (value) => {
    open = value
    if (open) hidden = false
    paint()
  }

  const onToggle = (event) => {
    event.preventDefault()
    setOpen(!open)
  }

  const onBackdrop = () => setOpen(false)

  const onKey = (event) => {
    if (event.key === 'Escape' && open) setOpen(false)
  }

  let lastY = window.scrollY

  const onScroll = () => {
    const y = window.scrollY
    const delta = y - lastY

    if (Math.abs(delta) < SCROLL_TOLERANCE) return
    lastY = y

    if (y <= 0) {
      hidden = false
      paint()
      return
    }

    hidden = delta > 0
    paint()
  }

  const contactTarget = () => {
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const contact = document.querySelector('[data-bd-contact]')
    if (!contact) return max

    const rect = contact.getBoundingClientRect()
    const top = rect.top + window.scrollY
    const end = top + rect.height - window.innerHeight
    return Math.max(0, Math.min(end, max))
  }

  const scrollToContact = () => {
    const lenis = getLenis()
    if (lenis) {
      lenis.resize()
      lenis.scrollTo(contactTarget(), { duration: 1.8 })
      return
    }
    window.scrollTo({ top: contactTarget(), behavior: 'smooth' })
  }

  const onDropdownClick = (event) => {
    const link = event.target.closest('a')
    if (!link) return

    if (link.getAttribute('aria-current') === 'page') {
      event.preventDefault()
      return
    }

    const href = link.getAttribute('href') || ''

    if (href.endsWith('#contact')) {
      event.preventDefault()
      setOpen(false)
      if (window.location.pathname === '/') scrollToContact()
      else window.location.href = href
      return
    }

    setOpen(false)
  }

  if (window.location.hash === '#contact' && document.querySelector('[data-bd-contact]')) {
    window.setTimeout(() => {
      const lenis = getLenis()
      if (lenis) {
        lenis.resize()
        lenis.scrollTo(contactTarget(), { immediate: true })
      } else {
        window.scrollTo({ top: contactTarget() })
      }
    }, 300)
  }

  toggle.addEventListener('click', onToggle)
  backdrop.addEventListener('click', onBackdrop)
  dropdown.addEventListener('click', onDropdownClick)
  window.addEventListener('keydown', onKey)
  window.addEventListener('scroll', onScroll, { passive: true })

  paint()

  return () => {
    toggle.removeEventListener('click', onToggle)
    backdrop.removeEventListener('click', onBackdrop)
    dropdown.removeEventListener('click', onDropdownClick)
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('scroll', onScroll)
  }
}

export function initHero() {
  const hero = document.querySelector('[data-bd-hero]')
  if (!hero) return () => {}

  const image = hero.querySelector('[data-bd-hero-image]')
  const text = hero.querySelector('[data-bd-hero-text]')

  const stopImage = initParallax(hero, image, { speed: -0.42 })
  const stopText = initParallax(hero, text, { speed: -0.85 })

  return () => {
    stopImage()
    stopText()
  }
}

export function initMenu() {
  const frame = document.querySelector('[data-bd-menu-frame]')
  const image = document.querySelector('[data-bd-menu-image]')
  if (!frame || !image) return () => {}
  return initParallax(frame, image, { speed: 0.42 })
}

const clamp01 = (value) => Math.min(Math.max(value, 0), 1)

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return '(' + digits.slice(0, 3) + ') ' + digits.slice(3)
  return '(' + digits.slice(0, 3) + ') ' + digits.slice(3, 6) + '-' + digits.slice(6)
}

export function initContactForm() {
  const form = document.querySelector('[data-bd-contact-form]')
  if (!form) return () => {}

  const heading = document.querySelector('[data-bd-contact-heading]')
  if (heading && form.querySelector('[data-bd-contact-posted]')) {
    heading.classList.add('is-posted')
  }

  const steps = Array.from(form.querySelectorAll('[data-bd-step]'))
  if (steps.length === 0) return () => {}

  const dots = Array.from(form.querySelectorAll('.bd-contact__dot'))
  const note = form.querySelector('[data-bd-contact-note]')
  const back = form.querySelector('[data-bd-contact-back]')
  const next = form.querySelector('[data-bd-contact-next]')

  let index = 0

  const currentInput = () => steps[index].querySelector('[data-bd-input]')

  const validity = () => {
    const input = currentInput()
    const rule = steps[index].dataset.bdRule
    const value = input.value
    const max = Number(input.dataset.bdMax || 0)
    const atLimit = max > 0 && value.length >= max

    if (atLimit) return { ok: false, message: 'Maximum ' + max + ' characters.' }

    if (rule === 'email') {
      if (!EMAIL_PATTERN.test(value)) {
        const message = value.length > 0 ? 'Enter a valid email address.' : ''
        return { ok: false, message: message }
      }
      return { ok: true, message: '' }
    }

    if (rule === 'phone') {
      const digits = value.replace(/\D/g, '').length
      if (digits === 0 || digits === 10) return { ok: true, message: '' }
      return { ok: false, message: '' }
    }

    return { ok: value.trim().length > 0, message: '' }
  }

  const paint = () => {
    steps.forEach((step, i) => step.classList.toggle('is-active', i === index))
    dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index))

    const state = validity()
    if (note) {
      note.textContent = state.message
      note.classList.toggle('is-visible', state.message.length > 0)
    }

    if (next) {
      next.disabled = !state.ok
      next.textContent = index === steps.length - 1 ? 'Submit' : 'Next'
    }

    if (back) back.hidden = index === 0
  }

  const onInput = (event) => {
    const input = event.target
    if (!input.matches('[data-bd-input]')) return
    if (steps[index].dataset.bdRule === 'phone') {
      const formatted = formatPhone(input.value)
      if (formatted !== input.value) input.value = formatted
    }
    paint()
  }

  const onSubmit = (event) => {
    if (!validity().ok) {
      event.preventDefault()
      return
    }

    if (index < steps.length - 1) {
      event.preventDefault()
      index += 1
      paint()
      const input = currentInput()
      if (input) input.focus({ preventScroll: true })
      return
    }

    if (next) {
      next.disabled = true
      next.textContent = 'Sending'
    }
  }

  const onBack = () => {
    if (index === 0) return
    index -= 1
    paint()
    const input = currentInput()
    if (input) input.focus({ preventScroll: true })
  }

  form.addEventListener('input', onInput)
  form.addEventListener('submit', onSubmit)
  if (back) back.addEventListener('click', onBack)

  paint()

  return () => {
    form.removeEventListener('input', onInput)
    form.removeEventListener('submit', onSubmit)
    if (back) back.removeEventListener('click', onBack)
  }
}

const RIGHT_INSET = 0.9
const DETAILS_DROP = 240
const PHOTO_START = { width: 34, height: 40 }
const PHOTO_END_WIDTH = 98.3

export function initContactScroll() {
  const wrapper = document.querySelector('[data-bd-contact]')
  if (!wrapper) return () => {}

  const photo = wrapper.querySelector('[data-bd-contact-photo]')
  const details = wrapper.querySelector('[data-bd-contact-details]')
  const extras = wrapper.querySelector('[data-bd-contact-extras]')
  if (!photo || !details || !extras) return () => {}

  const stacked = window.matchMedia('(max-width: 900px)')

  const revealObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        details.classList.add('is-revealed')
        revealObserver.disconnect()
      }
    },
    { threshold: 0.2 },
  )
  revealObserver.observe(details)

  let raf = 0
  let current = 0
  let target = 0
  let running = false

  const reset = () => {
    photo.style.width = ''
    photo.style.height = ''
    photo.style.right = ''
    photo.style.bottom = ''
    details.style.color = ''
    details.style.transform = ''
    extras.style.opacity = ''
  }

  const measure = () => {
    const rect = wrapper.getBoundingClientRect()
    const travel = Math.max(rect.height - window.innerHeight, 1)
    target = clamp01(-rect.top / travel)
  }

  const apply = (t) => {
    const stage = photo.parentElement
    const stageHeight = stage ? stage.clientHeight : window.innerHeight
    const footerHeight =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-h')) || 56
    const endTop = (footerHeight / stageHeight) * 100
    const endHeight = 100 - endTop

    photo.style.right = RIGHT_INSET + '%'
    photo.style.bottom = '0'
    photo.style.width = lerp(PHOTO_START.width, PHOTO_END_WIDTH, t) + '%'
    photo.style.height = lerp(PHOTO_START.height, endHeight, t) + '%'

    const tone = clamp01((t - 0.35) / 0.3)
    const channel = Math.round(lerp(30, 255, tone))
    details.style.color = 'rgb(' + channel + ', ' + channel + ', ' + channel + ')'
    details.style.transform = 'translateY(' + lerp(DETAILS_DROP, 0, t) + 'px)'

    extras.style.opacity = String(clamp01((t - 0.6) / 0.25))
  }

  const tick = () => {
    current += (target - current) * 0.14
    apply(current)
    raf = requestAnimationFrame(tick)
  }

  const start = () => {
    if (running) return
    running = true
    measure()
    current = target
    apply(current)
    raf = requestAnimationFrame(tick)
  }

  const stop = () => {
    if (!running) return
    running = false
    cancelAnimationFrame(raf)
    reset()
  }

  const onScroll = () => measure()

  const sync = () => {
    if (stacked.matches) stop()
    else start()
  }

  sync()
  stacked.addEventListener('change', sync)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)

  return () => {
    stop()
    revealObserver.disconnect()
    stacked.removeEventListener('change', sync)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  }
}

export function initFaq() {
  const frame = document.querySelector('[data-bd-faq-frame]')
  const image = document.querySelector('[data-bd-faq-image]')
  if (!frame || !image) return () => {}
  return initParallax(frame, image, { speed: -0.42 })
}
