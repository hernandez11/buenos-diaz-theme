# Buenos Díaz Shopify theme

Store: `cgvkri-pv.myshopify.com`
Repo: https://github.com/hernandez11/buenos-diaz-theme

## Run it

```
cd ~/Desktop/Projects/React/buenos-diaz-theme
shopify theme dev --store cgvkri-pv.myshopify.com
```

Skip the flag every time:

```
echo 'export SHOPIFY_FLAG_STORE=cgvkri-pv.myshopify.com' >> ~/.zshrc
```

## Working rules

The React app at `../buenos-diaz/` is **read only reference material**. It gets read to port components across and is never edited.

The React app stays deployed on Cloudflare until the domain points at Shopify. Do not delete it or tear down Cloudflare before then. It is what serves buenosdiaznyc.com today.

Local files are the source of truth during the build. Do not edit theme code in the Shopify admin, or a push will silently clobber it. Editing content, menus, section settings, products, and metaobjects in the admin is always safe.

## Ported so far

| Theme file | Came from |
|---|---|
| `assets/base.css` | `theme/tokens.ts`, `theme/typography.ts`, `theme/GlobalStyles.css` |
| `assets/motion.js` | `useLenis.ts`, `SlideReveal.tsx`, `useParallax.ts`, `Cursor.tsx`, `useVisualZoom.ts`, `ScrollLogo.tsx`, `Header.tsx` |
| `assets/lenis.min.js` | Lenis 1.3.26, vendored, no CDN |
| `assets/PrimaryLogo.png`, `assets/HeroBg.webp` | `src/assets/` |
| `sections/header.liquid` | `Header.tsx` plus `ScrollLogo.tsx` markup |
| `sections/footer.liquid` | `Footer.tsx` |
| `sections/hero.liquid` | `Hero.tsx` |
| `sections/info-panel.liquid` | the story block in `Home.tsx` |
| `snippets/fonts.liquid` | Inter 300, 400, 500, 600 |
| `layout/theme.liquid` | `App.tsx` shell, boots the motion modules |

## Everything ported

| Theme file | Came from |
|---|---|
| `sections/menu.liquid` | `MenuDisplay.tsx`, drinks are editable blocks |
| `sections/contact.liquid` | `ContactSection.tsx`, form posts to Shopify |
| `sections/faq.liquid` | `FaqPage.tsx`, questions are editable blocks |
| `sections/events.liquid` | `EventsGallery.tsx`, driven by metaobjects |
| `sections/event-detail.liquid` | `EventDetail.tsx`, metaobject template |
| `sections/404.liquid` | `NotFound.tsx` |
| `assets/events.js` | carousel, reveals, and video handling |
| `assets/shop.css` | new, styles product, collection, and cart |
| `sections/product.liquid`, `collection.liquid`, `collections.liquid`, `cart.liquid` | new, no React equivalent |

## Pages created in the store

| Page | Handle | Template |
|---|---|---|
| FAQ | `faq` | `page.faq` |
| Events | `events` | `page.events` |

Event detail pages come from the metaobject and render through `templates/metaobject/event.json`.

## Reveal markup

React:

```jsx
<SlideReveal index={2}>Some text</SlideReveal>
```

Liquid:

```html
<div class="reveal-mask" data-reveal-index="2">
  <div class="reveal-inner">Some text</div>
</div>
```

Optional `data-reveal-delay` and `data-reveal-duration` in seconds. Defaults match React: `index * 0.12` and `1.4`.

## Events metaobject

Created in the store as type `event`, id `gid://shopify/MetaobjectDefinition/22511747269`.

| Field | Type | Notes |
|---|---|---|
| `title` | single line text | Required, used as the display name |
| `date` | date | Required. Future dates render as Coming Soon and are not clickable |
| `description` | multi line text | Paragraph on the detail page |
| `poster` | file reference, image | The carousel image |
| `gallery` | list of file references, image or video | Detail page media, in order |
| `layout` | list of single line text | Block pattern: full, wide, tall, pair |

Web pages are enabled with the URL handle `events`, so each published event gets its own URL. Redirects are created automatically if a handle changes.

Add events under **Content → Metaobjects → Event** in the admin. No code required.

## Behavior differences worth knowing

**Contact form.** Shopify's contact form does a real page POST, so after Submit the page reloads and comes back showing THANK YOU. The React version swapped inline with no reload. Everything looks the same, there is just a page load in the middle.

**Event detail navigation.** In React the events index and a detail page shared one mounted carousel, so it visually collapsed in place. On Shopify those are two separate pages, so the detail page renders its own centered poster image at the top to reproduce the same end state. The 350ms fade before navigating is preserved.

**Event ordering.** Events sort by date, newest first, computed in Liquid. The carousel opens centered on the most recent event that has already happened. Future dated events show COMING SOON and are not clickable, the same rule as before.

## Does not transfer

The contact form runs through a Cloudflare Function and Resend. Shopify has a native contact form that emails the store address, so `functions/api/contact.ts`, `api/contact.ts`, and the Resend API key all become unnecessary. Revoke that key once the Shopify form is live.

## Admin items still open

1. Store timezone is set to MDT. You are in NYC. Settings, General, Store defaults.
2. Store is on the Advanced plan. Basic covers everything in this build.
3. `buenosdiaznyc.com` is not connected yet. Leave it until the theme is done.
