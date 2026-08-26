const FLIP_DURATION_MS = 600
const FADE_OUT_MS = 350
const ENTER_DELAY_MS = 600
const ENTER_STAGGER_MS = 30
const THIN_WIDTH = 6.5

const widthForDistance = (distance) => {
  if (distance === 0) return 50
  if (distance === 1) return 10
  if (distance === 2) return 9
  if (distance === 3) return 5
  return THIN_WIDTH
}

const overlayForDistance = (distance) => {
  if (distance === 0) return 0
  if (distance === 1) return 0.5
  if (distance === 2) return 0.6
  if (distance === 3) return 0.7
  return 0.75
}

export function initEvents() {
  const root = document.querySelector('[data-bd-events]')
  if (!root) return () => {}

  const dataNode = root.querySelector('[data-bd-events-data]')
  if (!dataNode) return () => {}

  let items = []
  try {
    items = JSON.parse(dataNode.textContent)
  } catch (error) {
    return () => {}
  }
  if (items.length === 0) return () => {}

  const count = Number(root.dataset.bdCount)
  const copies = Number(root.dataset.bdCopies)
  const total = count * copies
  const safeMin = count * 2
  const safeMax = total - count * 2

  const track = root.querySelector('[data-bd-events-track]')
  const tiles = Array.from(root.querySelectorAll('[data-bd-tile]'))
  const overlays = tiles.map((tile) => tile.querySelector('[data-bd-overlay]'))
  const above = root.querySelector('[data-bd-events-above]')
  const dateEl = root.querySelector('[data-bd-events-date]')
  const titleEl = root.querySelector('[data-bd-events-title]')
  const dots = Array.from(root.querySelectorAll('.bd-events__dot'))

  let center = Number(root.dataset.bdCenter)
  let leaving = false
  let leaveTimer = 0

  const shortViewport = window.matchMedia('(max-height: 720px)')
  const mobile = window.matchMedia('(max-width: 767px)')

  const activeItem = () => items[((center % count) + count) % count]

  const trackOffset = () => {
    let before = 0
    for (let v = 0; v < center; v++) {
      before += widthForDistance(Math.abs(v - center))
    }
    return 50 - before - widthForDistance(0) / 2
  }

  const paint = () => {
    tiles.forEach((tile, i) => {
      const v = Number(tile.dataset.bdV)
      const distance = Math.abs(v - center)
      const isCenter = v === center
      const locked = tile.dataset.bdLocked === 'true'

      tile.style.flexBasis = widthForDistance(distance) + 'cqw'
      tile.classList.toggle('is-muted', leaving && !isCenter)
      tile.classList.toggle('is-locked', isCenter && locked)

      const overlay = overlays[i]
      if (overlay) overlay.style.opacity = String(overlayForDistance(distance))

      const reveal = tile.querySelector('.bd-events__tile-reveal')
      if (reveal) {
        reveal.style.setProperty(
          '--enter-delay',
          ENTER_DELAY_MS + distance * ENTER_STAGGER_MS + 'ms',
        )
      }
    })

    if (track) track.style.transform = 'translateX(' + trackOffset() + 'cqw)'

    const item = activeItem()
    if (dateEl) dateEl.textContent = item.date
    if (titleEl) titleEl.textContent = item.title
    if (above) above.hidden = !item.upcoming

    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === ((center % count) + count) % count)
    })
  }

  const freezeAndShift = (shift) => {
    if (!track) return

    const pxPerCqw = root.getBoundingClientRect().width / 100
    const thinPx = THIN_WIDTH * pxPerCqw

    const widths = new Map()
    const opacities = new Map()

    tiles.forEach((tile, i) => {
      const v = Number(tile.dataset.bdV)
      widths.set(v, tile.getBoundingClientRect().width)
      const overlay = overlays[i]
      if (overlay) opacities.set(v, getComputedStyle(overlay).opacity)
    })

    const tx = new DOMMatrixReadOnly(getComputedStyle(track).transform).m41

    track.style.transition = 'none'
    track.style.transform = 'translateX(' + (tx - shift * THIN_WIDTH * pxPerCqw) + 'px)'

    tiles.forEach((tile, i) => {
      const v = Number(tile.dataset.bdV)
      tile.style.transition = 'none'
      const source = widths.get(v - shift)
      tile.style.flexBasis = (source === undefined ? thinPx : source) + 'px'

      const overlay = overlays[i]
      if (overlay) {
        overlay.style.transition = 'none'
        const value = opacities.get(v - shift)
        overlay.style.opacity = value === undefined ? '0.75' : value
      }
    })

    if (track) track.getBoundingClientRect()

    requestAnimationFrame(() => {
      track.style.transition = ''
      tiles.forEach((tile, i) => {
        tile.style.transition = ''
        const overlay = overlays[i]
        if (overlay) overlay.style.transition = ''
      })
      paint()
    })
  }

  const leaveTo = (url) => {
    leaving = true
    root.classList.add('is-leaving')
    root.classList.remove('is-pinned')
    paint()
    leaveTimer = window.setTimeout(() => {
      window.location.href = url
    }, FADE_OUT_MS)
  }

  const onClick = (event) => {
    if (leaving) return
    const tile = event.target.closest('[data-bd-tile]')
    if (!tile) return

    const v = Number(tile.dataset.bdV)

    if (v === center) {
      if (tile.dataset.bdLocked === 'true') return
      const url = tile.dataset.bdUrl
      if (url) leaveTo(url)
      return
    }

    let shift = 0
    if (v < safeMin) shift = count
    else if (v > safeMax) shift = -count

    center = v + shift

    if (shift !== 0) freezeAndShift(shift)
    else paint()
  }

  const syncPinned = () => {
    const pinned = !leaving && !shortViewport.matches && !mobile.matches
    root.classList.toggle('is-pinned', pinned)
  }

  root.addEventListener('click', onClick)
  shortViewport.addEventListener('change', syncPinned)
  mobile.addEventListener('change', syncPinned)
  window.addEventListener('resize', syncPinned)

  syncPinned()
  paint()

  return () => {
    window.clearTimeout(leaveTimer)
    root.removeEventListener('click', onClick)
    shortViewport.removeEventListener('change', syncPinned)
    mobile.removeEventListener('change', syncPinned)
    window.removeEventListener('resize', syncPinned)
  }
}

export function initEventCards() {
  const locked = document.querySelectorAll('[data-bd-card-locked]')
  const onClick = (event) => event.preventDefault()
  locked.forEach((card) => card.addEventListener('click', onClick))
  return () => locked.forEach((card) => card.removeEventListener('click', onClick))
}

export function initDetailFrames() {
  const frames = Array.from(document.querySelectorAll('[data-bd-frame]'))
  if (frames.length === 0) return () => {}

  const timers = []
  const observers = []

  frames.forEach((frame) => {
    const show = () => frame.classList.add('is-visible')

    if (typeof IntersectionObserver === 'undefined') {
      show()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          show()
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(frame)
    observers.push(observer)

    const rect = frame.getBoundingClientRect()
    const startsInView = rect.top < window.innerHeight && rect.bottom > 0

    if (startsInView) {
      timers.push(
        window.setTimeout(() => {
          show()
          observer.disconnect()
        }, 3000),
      )
    }
  })

  return () => {
    timers.forEach((id) => window.clearTimeout(id))
    observers.forEach((observer) => observer.disconnect())
  }
}

export function initClips() {
  const clips = Array.from(document.querySelectorAll('[data-bd-clip]'))
  if (clips.length === 0) return () => {}

  const resume = () => {
    if (document.visibilityState !== 'visible') return
    clips.forEach((clip) => {
      const attempt = clip.play()
      if (attempt && attempt.catch) attempt.catch(() => {})
    })
  }

  clips.forEach((clip) => {
    clip.addEventListener('pause', resume)
    clip.addEventListener('canplay', resume)
  })
  document.addEventListener('visibilitychange', resume)
  resume()

  return () => {
    clips.forEach((clip) => {
      clip.removeEventListener('pause', resume)
      clip.removeEventListener('canplay', resume)
    })
    document.removeEventListener('visibilitychange', resume)
  }
}
