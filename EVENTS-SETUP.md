# Populating the events

## Step 1: upload the media

Shopify admin → **Content → Files** → drag and drop.

Source folder on your machine:

```
~/Desktop/Projects/React/buenos-diaz/buenos-diaz/src/assets/Events/
```

Select all 18 files from the three subfolders and drop them in at once. Shopify Files is flat, so the folders do not matter and every filename is already unique. Videos take a minute to process after upload.

Two files in that folder are unused by the current site data (`Obscure_gallery_4.webp`, `Shopify_clip_1.mp4`). Uploading them is harmless.

Tell me when the upload finishes and I will create the three event entries via the API, wired to the exact files, dates, ordering, and layout patterns below.

## What I will create

### Obscure Coffee Roasters

| Field | Value |
|---|---|
| Date | 2026-08-15 |
| Poster | `Obscure_gallery_1.webp` |
| Layout | full, wide, pair, wide, pair |

Gallery in order:

1. `Obscure_recap.mp4`
2. `Obscure_clip_3.mp4`
3. `Obscure_clip_2.mp4`
4. `Obscure_clip_4.mp4`
5. `Obscure_clip_1.mp4`
6. `Obscure_gallery_3.webp`
7. `Obscure_gallery_2.webp`

### Shopify | Summer Biz Connect

| Field | Value |
|---|---|
| Date | 2026-07-21 |
| Poster | `Shopify_gallery_3.webp` |
| Layout | full, wide, wide, tall, pair |

Gallery in order:

1. `Shopify_recap.mp4`
2. `Shopify_gallery_1.webp`
3. `Shopify_gallery_2.webp`
4. `Shopify_gallery_3.webp`
5. `Shopify_clip_3.mp4`
6. `Shopify_gallery_4.webp`
7. `Shopify_clip_2.mp4`

### Remedy Place

| Field | Value |
|---|---|
| Date | 2026-09-06 |
| Poster | `Remedy_gallery_1.webp` |
| Gallery | none |
| Layout | none |

Dated in the future, so it renders as COMING SOON and stays unclickable, matching the current site.

## Adding events later

Content → Metaobjects → Event → Add. Fill in title, date, description, poster, gallery, and layout. The carousel picks it up automatically, sorts by date, and opens centered on the most recent event that has already happened.

Layout values are `full`, `wide`, `tall`, and `pair`, one per line. `pair` consumes two gallery items side by side, the others consume one. Leave layout empty for the default pattern of full, pair, wide, tall.
