import { describe, expect, it } from 'vitest'
import { renderMarkdown, safeWebUrl } from '../app/utils/render-markdown'

describe('safe Markdown for published content and previews', () => {
  it.each([
    '<img src="https://example.com/a.png" onerror="alert(1)">',
    '<svg><a xlink:href="javascript:alert(1)">bad</a></svg>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<script>alert(1)</script><style>body{display:none}</style>',
    '<a href="jav&#x61;script:alert(1)" onclick="alert(1)">bad</a>',
    '[bad](javascript:alert%281%29)',
    '<img src="data:image/svg+xml,bad">',
  ])('strips active content: %s', (source) => {
    const html = renderMarkdown(source)
    expect(html).not.toMatch(/onerror|onclick|javascript:|<script|<style|<iframe|<svg|data:image/i)
  })
  it('preserves useful formatting, code, images and safe links', () => {
    const html = renderMarkdown('# A game\n\n**Strong** [Read](/blog/test)\n\n![frame](https://example.com/a.png)\n\n```ts\nconst x = 1\n```')
    expect(html).toContain('<h1>A game</h1>')
    expect(html).toContain('<strong>Strong</strong>')
    expect(html).toContain('href="/blog/test"')
    expect(html).toContain('src="https://example.com/a.png"')
    expect(html).toContain('class="language-ts"')
  })
  it('uses the same policy for inline summaries', () => {
    expect(renderMarkdown('**Nice** <img src=x onerror=alert(1)>', true)).toBe('<strong>Nice</strong> <img src="x" />')
  })
  it('rejects unsafe legacy external URLs', () => {
    expect(safeWebUrl('javascript:alert(1)')).toBeUndefined()
    expect(safeWebUrl('data:text/html,test')).toBeUndefined()
    expect(safeWebUrl('https://example.com/game')).toBe('https://example.com/game')
  })
})
