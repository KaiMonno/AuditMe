/** @typedef {import('./types').Finding} Finding */

function isBlank(value) {
  return value == null || String(value).trim() === '';
}

function add(findings, rule, severity, message, url) {
  /** @type {Finding} */
  const finding = { category: 'metadata', rule, severity, message };
  if (url) finding.url = url;
  findings.push(finding);
}

/**
 * Listeners are not needed for metadata — we snapshot the DOM after load.
 * @param {import('playwright').Page} _page
 * @param {Finding[]} _findings
 */
async function setup(_page, _findings) {}

/**
 * Inspect title, description, canonical, Open Graph tags, and img alt text.
 * Uses one page.evaluate() round-trip so we read a consistent DOM snapshot.
 *
 * @param {import('playwright').Page} page
 * @param {Finding[]} findings - shared collector for this audit run
 */
async function run(page, findings) {
  const snapshot = await page.evaluate(() => {
    const attr = (selector, name) => {
      const el = document.querySelector(selector);
      return el ? el.getAttribute(name) : null;
    };

    return {
      title: document.title ?? '',
      description: attr('meta[name="description"]', 'content'),
      canonical: attr('link[rel="canonical"]', 'href'),
      ogTitle: attr('meta[property="og:title"]', 'content'),
      ogDescription: attr('meta[property="og:description"]', 'content'),
      ogImage: attr('meta[property="og:image"]', 'content'),
      images: Array.from(document.querySelectorAll('img')).map((img) => ({
        src: img.getAttribute('src') || '',
        // null = attribute missing (a problem); "" = decorative (allowed)
        alt: img.getAttribute('alt'),
      })),
    };
  });

  const pageUrl = page.url();

  if (isBlank(snapshot.title)) {
    add(findings, 'missing-title', 'error', 'Page is missing a non-empty <title>', pageUrl);
  }

  if (snapshot.description == null) {
    add(
      findings,
      'missing-meta-description',
      'warning',
      'Missing <meta name="description">',
      pageUrl
    );
  } else if (isBlank(snapshot.description)) {
    add(
      findings,
      'missing-meta-description',
      'warning',
      'Meta description is empty',
      pageUrl
    );
  }

  if (snapshot.canonical == null) {
    add(findings, 'missing-canonical', 'warning', 'Missing <link rel="canonical">', pageUrl);
  } else if (isBlank(snapshot.canonical)) {
    add(findings, 'missing-canonical', 'warning', 'Canonical href is empty', pageUrl);
  }

  // OG tags are social-preview hints, not document requirements — warnings.
  if (isBlank(snapshot.ogTitle)) {
    add(findings, 'missing-og-title', 'warning', 'Missing og:title', pageUrl);
  }
  if (isBlank(snapshot.ogDescription)) {
    add(findings, 'missing-og-description', 'warning', 'Missing og:description', pageUrl);
  }
  if (isBlank(snapshot.ogImage)) {
    add(findings, 'missing-og-image', 'warning', 'Missing og:image', pageUrl);
  }

  for (const img of snapshot.images) {
    if (img.alt == null) {
      add(
        findings,
        'missing-img-alt',
        'error',
        `Image is missing an alt attribute (${img.src || 'no src'})`,
        img.src || pageUrl
      );
    }
  }
}

module.exports = { setup, run };
