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

    const failsafe = window.setTimeout(() => {
      show()
      observer.disconnect()
    }, REVEAL_FAILSAFE_MS)
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

  let frame = requestAnimationFrame(function tick() {
    el.style.transform = 'translate3d(' + target.x + 'px, ' + target.y + 'px, 0)'
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

  const tick = () => {
    const headerSlot = document.querySelector('[data-logo-slot="header"]')

    if (!headerSlot) {
      box.style.opacity = '0'
      setNavTone(1)
      frame = requestAnimationFrame(tick)
      return
    }

    const headerRect = headerSlot.getBoundingClientRect()
    const cover = document.querySelector('[data-hero-cover]')
    let tone = 1

    if (cover) {
      const coverTop = cover.getBoundingClientRect().top
      const overlap = (headerRect.bottom + NAV_FADE_BAND - coverTop) / NAV_FADE_BAND
      tone = Math.min(Math.max(overlap, 0), 1)
    }

    setNavTone(tone)

    box.style.opacity = '1'
    box.style.width = headerRect.width + 'px'
    box.style.height = headerRect.width / LOGO_RATIO + 'px'
    box.style.transform =
      'translate3d(' + headerRect.left + 'px, ' + headerRect.top + 'px, 0)'

    light.style.opacity = String(1 - tone)
    dark.style.opacity = String(tone)

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

  const scrollToContact = () => {
    const target = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(target, { duration: 1.8 })
    else window.scrollTo({ top: target, behavior: 'smooth' })
  }

  const onDropdownClick = (event) => {
    const link = event.target.closest('a')
    if (!link) return

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
