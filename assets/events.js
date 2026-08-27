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

const normalise = (value) => {
  const path = String(value || '').split('?')[0].split('#')[0]
  if (path.length > 1 && path.charAt(path.length - 1) === '/') return path.slice(0, -1)
  return path
}

const pending = new Map()

const prefetch = (url) => {
  if (!url) return Promise.reject(new Error('no url'))
  if (pending.has(url)) return pending.get(url)

  const task = fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } }).then(
    (response) => {
      if (!response.ok) throw new Error(String(response.status))
      return response.text()
    },
  )

  task.catch(() => pending.delete(url))
  pending.set(url, task)
  return task
}

export function initEvents(options) {
  const onNavigate = (options && options.onNavigate) || (() => {})

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
  const indexUrl = normalise(root.dataset.bdIndexUrl || '/pages/events')

  const main = root.closest('.bd-main') || document.body
  const track = root.querySelector('[data-bd-events-track]')
  const stage = root.querySelector('[data-bd-events-stage]')
  const centerBlock = root.querySelector('[data-bd-events-center]')
  const belowBlock = root.querySelector('[data-bd-events-below]')
  const tiles = Array.from(root.querySelectorAll('[data-bd-tile]'))
  const overlays = tiles.map((tile) => tile.querySelector('[data-bd-overlay]'))
  const above = root.querySelector('[data-bd-events-above]')
  const dateEl = root.querySelector('[data-bd-events-date]')
  const titleEl = root.querySelector('[data-bd-events-title]')
  const dots = Array.from(root.querySelectorAll('.bd-events__dot'))

  let center = Number(root.dataset.bdCenter)
  let detailOpen = root.dataset.bdDetail === 'true'
  let leaving = detailOpen
  let busy = false
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
    const faded = leaving || detailOpen

    tiles.forEach((tile, i) => {
      const v = Number(tile.dataset.bdV)
      const distance = Math.abs(v - center)
      const isCenter = v === center
      const locked = tile.dataset.bdLocked === 'true'

      tile.style.flexBasis = widthForDistance(distance) + 'cqw'
      tile.classList.toggle('is-muted', faded && !isCenter)
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

  const freezeGeometry = () => {
    if (!stage || !centerBlock || stage.style.height) return

    const sRect = stage.getBoundingClientRect()
    const cRect = centerBlock.getBoundingClientRect()
    const top = cRect.top - sRect.top

    if (belowBlock) {
      belowBlock.style.top = belowBlock.getBoundingClientRect().top - sRect.top + 'px'
    }

    centerBlock.style.top = top + 'px'
    centerBlock.style.transform = 'none'
    stage.style.minHeight = '0px'
    stage.style.height = top + cRect.height + 'px'
    stage.style.flex = '0 0 auto'
  }

  const releaseGeometry = () => {
    if (stage) {
      stage.style.removeProperty('height')
      stage.style.removeProperty('min-height')
      stage.style.removeProperty('flex')
    }
    if (centerBlock) {
      centerBlock.style.removeProperty('top')
      centerBlock.style.removeProperty('transform')
    }
    if (belowBlock) belowBlock.style.removeProperty('top')
  }

  const syncPinned = () => {
    const pinned = !leaving && !detailOpen && !shortViewport.matches && !mobile.matches
    root.classList.toggle('is-pinned', pinned)
  }

  const syncNav = (url) => {
    const path = normalise(url)
    document.querySelectorAll('.bd-dropdown__link').forEach((link) => {
      const href = link.getAttribute('href') || ''
      if (href.indexOf('#') >= 0) return
      const current = normalise(href) === path
      if (current) {
        link.setAttribute('aria-current', 'page')
        link.setAttribute('data-bd-nav-current', '')
      } else {
        link.removeAttribute('aria-current')
        link.removeAttribute('data-bd-nav-current')
      }
    })
  }

  const swapDetail = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const next = doc.querySelector('[data-bd-detail-root]')
    if (!next) return false

    const existing = document.querySelector('[data-bd-detail-root]')
    if (existing) existing.remove()

    main.appendChild(document.importNode(next, true))

    const title = doc.querySelector('title')
    if (title) document.title = title.textContent
    return true
  }

  const openDetail = (url, push) => {
    busy = true

    const fetched = prefetch(url)
    const faded = new Promise((resolve) => {
      leaveTimer = window.setTimeout(resolve, FADE_OUT_MS)
    })

    Promise.all([fetched, faded])
      .then((results) => {
        if (!swapDetail(results[0])) throw new Error('detail markup missing')

        detailOpen = true
        leaving = true
        root.classList.add('is-detail')
        document.body.classList.add('bd-detail-open')

        if (push) window.history.pushState({ bd: 'detail' }, '', url)

        syncNav(url)
        syncPinned()
        paint()
        window.scrollTo(0, 0)
        onNavigate()
        busy = false
      })
      .catch(() => {
        window.location.href = url
      })
  }

  const closeDetail = (push) => {
    const existing = document.querySelector('[data-bd-detail-root]')
    if (existing) existing.remove()

    detailOpen = false
    leaving = false
    root.classList.remove('is-detail', 'is-leaving')
    document.body.classList.remove('bd-detail-open')
    releaseGeometry()

    if (push) window.history.pushState({ bd: 'index' }, '', indexUrl)

    syncNav(indexUrl)
    syncPinned()
    paint()
    window.scrollTo(0, 0)
    onNavigate()
  }

  const leaveTo = (url) => {
    if (busy) return
    leaving = true
    freezeGeometry()
    root.classList.add('is-leaving')
    syncPinned()
    paint()
    openDetail(url, true)
  }

  const onClick = (event) => {
    if (busy || detailOpen) return

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

  const onHover = (event) => {
    if (detailOpen) return
    const tile = event.target.closest('[data-bd-tile]')
    if (!tile || tile.dataset.bdLocked === 'true') return
    if (Number(tile.dataset.bdV) !== center) return
    prefetch(tile.dataset.bdUrl).catch(() => {})
  }

  const onDocumentClick = (event) => {
    if (!detailOpen || busy) return
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    const link = event.target.closest('a')
    if (!link || link.target === '_blank') return
    if (normalise(link.getAttribute('href')) !== indexUrl) return

    event.preventDefault()
    closeDetail(true)
  }

  const onPopState = () => {
    const path = normalise(window.location.pathname)

    if (path === indexUrl) {
      if (detailOpen) closeDetail(false)
      return
    }

    const item = activeItem()
    if (!detailOpen && item && normalise(item.url) === path) {
      leaving = true
      freezeGeometry()
      root.classList.add('is-leaving')
      syncPinned()
      paint()
      openDetail(item.url, false)
      return
    }

    if (!detailOpen) window.location.reload()
  }

  root.addEventListener('click', onClick)
  root.addEventListener('pointerover', onHover)
  document.addEventListener('click', onDocumentClick)
  window.addEventListener('popstate', onPopState)
  shortViewport.addEventListener('change', syncPinned)
  mobile.addEventListener('change', syncPinned)
  window.addEventListener('resize', syncPinned)

  if (detailOpen) document.body.classList.add('bd-detail-open')

  syncPinned()
  paint()

  return () => {
    window.clearTimeout(leaveTimer)
    root.removeEventListener('click', onClick)
    root.removeEventListener('pointerover', onHover)
    document.removeEventListener('click', onDocumentClick)
    window.removeEventListener('popstate', onPopState)
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
  const frames = Array.from(document.querySelectorAll('[data-bd-frame]:not([data-bd-frame-bound])'))
  if (frames.length === 0) return () => {}

  const timers = []
  const observers = []

  frames.forEach((frame) => {
    frame.setAttribute('data-bd-frame-bound', '')

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
  const clips = Array.from(document.querySelectorAll('[data-bd-clip]:not([data-bd-clip-bound])'))
  if (clips.length === 0) return () => {}

  const resume = () => {
    if (document.visibilityState !== 'visible') return
    clips.forEach((clip) => {
      const attempt = clip.play()
      if (attempt && attempt.catch) attempt.catch(() => {})
    })
  }

  clips.forEach((clip) => {
    clip.setAttribute('data-bd-clip-bound', '')
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
