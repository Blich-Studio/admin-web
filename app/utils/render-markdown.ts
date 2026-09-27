import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'

/** Apply the same allowlist during server rendering and interactive previews. */
export function renderMarkdown(markdown: string, inline = false): string {
  const html = inline
    ? marked.parseInline(markdown, { async: false })
    : marked.parse(markdown, { async: false })
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote',
      'ul', 'ol', 'li', 'strong', 'em', 'del', 's', 'a', 'img', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      ol: ['start'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
    },
    allowedClasses: { code: ['language-*'] },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedSchemesByTag: { img: ['https', 'http'] },
    allowProtocolRelative: false,
    parseStyleAttributes: false,
  })
}

/** Existing stored links also need protocol checks, not only new API writes. */
export function safeWebUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
