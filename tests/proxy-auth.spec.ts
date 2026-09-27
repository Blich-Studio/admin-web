import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '../server/api/_proxy/[...path]'
interface TestEvent {
  path: string
  method: string
  headers: Record<string, string>
  body?: unknown
  cookies: string[]
  status: number
}
interface ProxyOptions { body: { refreshToken: string }; headers: Record<string, string> }
const handle = handler as unknown as (event: TestEvent) => Promise<unknown>

vi.mock('h3', () => ({
  defineEventHandler: (fn: unknown) => fn,
  getMethod: (event: TestEvent) => event.method,
  getRouterParam: (event: TestEvent) => event.path,
  getQuery: () => ({}),
  getHeaders: (event: TestEvent) => event.headers,
  readBody: async (event: TestEvent) => event.body,
  readRawBody: async (event: TestEvent) => event.body,
  appendHeader: (event: TestEvent, _name: string, value: string) => event.cookies.push(value),
  setResponseStatus: (event: TestEvent, status: number) => { event.status = status },
  createError: (value: { statusMessage: string; statusCode: number }) => Object.assign(new Error(value.statusMessage), value),
}))
const prefix = 'cms'
const raw = vi.fn()
function event(path = 'auth/me', actor = 'A', method = 'GET'): TestEvent {
  return { path, method, headers: { host: 'admin.example.test', cookie: `${prefix}_access=expired-${actor}; ${prefix}_refresh=refresh-${actor}` }, body: undefined, cookies: [] as string[], status: 200 }
}
function response(data: unknown, status = 200) { return { _data: data, status, headers: new Headers() } }
function unauthorized() { return Object.assign(new Error('Expired'), { statusCode: 401 }) }
beforeEach(() => {
  raw.mockReset()
  vi.stubGlobal('$fetch', { raw })
  vi.stubGlobal('useRuntimeConfig', () => ({ apiUrl: 'https://api.example.test', public: {} }))
})

describe('cookie-only proxy sessions', () => {
  it.each([false, true])('removes tokens from the actual login response (wrapped=%s)', async (wrapped) => {
    const tokens = { access_token: 'AT', refresh_token: 'RT', user: { id: 'A' } }
    raw.mockResolvedValue(response(wrapped ? { data: tokens } : tokens))
    const request = event('auth/login', 'A', 'POST')
    const data = await handle(request)
    expect(JSON.stringify(data)).not.toMatch(/access_token|refresh_token|AT|RT/)
    expect(request.cookies).toEqual(expect.arrayContaining([
      expect.stringContaining(`${prefix}_access=AT; Path=/; HttpOnly; Secure;`),
      expect.stringContaining(`${prefix}_refresh=RT; Path=/; HttpOnly; Secure;`),
    ]))
  })
  it('uses cookies rather than a client-supplied Authorization header', async () => {
    raw.mockResolvedValue(response({ userId: 'A' }))
    const request = event()
    Object.assign(request.headers, { authorization: 'Bearer other-user' })
    await handle(request)
    expect(raw.mock.calls[0][1].headers.authorization).toBe('Bearer expired-A')
  })
  it('keeps concurrent users isolated', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    raw.mockImplementation(async (url: string, options: ProxyOptions) => {
      if (url.endsWith('/auth/refresh')) {
        await gate
        const actor = options.body.refreshToken.split('-')[1]
        return response({ access_token: `fresh-${actor}`, refresh_token: `rotated-${actor}` })
      }
      if (options.headers.authorization.includes('expired')) throw unauthorized()
      return response({ actor: options.headers.authorization })
    })
    const a = event('articles', 'A'), b = event('articles', 'B')
    const results = Promise.all([handle(a), handle(b)])
    await vi.waitFor(() => expect(raw.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(2))
    release()
    expect(await results).toEqual([{ actor: 'Bearer fresh-A' }, { actor: 'Bearer fresh-B' }])
    expect(a.cookies.join(' ')).not.toContain('fresh-B')
    expect(b.cookies.join(' ')).not.toContain('fresh-A')
  })
  it('shares same-session work but sends rotated cookies to every waiting response', async () => {
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    raw.mockImplementation(async (url: string, options: ProxyOptions) => {
      if (url.endsWith('/auth/refresh')) { await gate; return response({ access_token: 'fresh-A', refresh_token: 'rotated-A' }) }
      if (options.headers.authorization.includes('expired')) throw unauthorized()
      return response({ ok: true })
    })
    const a = event(), b = event()
    const results = Promise.all([handle(a), handle(b)])
    await vi.waitFor(() => expect(raw.mock.calls).toHaveLength(3))
    release()
    await results
    for (const request of [a, b]) expect(request.cookies.join(' ')).toContain(`${prefix}_refresh=rotated-A`)
    expect(raw.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1)
  })
  it.each([404, 503])('clears both cookies even when revocation returns %s', async (status) => {
    raw.mockRejectedValue(Object.assign(new Error('Failed'), { statusCode: status }))
    const request = event('auth/logout', 'A', 'POST')
    request.body = { refreshToken: 'attacker-controlled' }
    await Promise.resolve(handle(request)).catch(() => undefined)
    expect(request.cookies).toHaveLength(2)
    expect(request.cookies.every(cookie => cookie.includes('Expires=Thu, 01 Jan 1970'))).toBe(true)
    expect(raw.mock.calls[0][1].body).toEqual({ refreshToken: 'refresh-A' })
  })
  it('keeps cookies during a temporary refresh-service failure', async () => {
    raw.mockImplementation(async (url: string) => {
      if (url.endsWith('/auth/refresh')) throw Object.assign(new Error('Unavailable'), { statusCode: 503 })
      throw unauthorized()
    })
    const request = event()
    await expect(handle(request)).rejects.toMatchObject({ statusCode: 503 })
    expect(request.cookies).toEqual([])
  })
  it('clears an expired access cookie when no refresh cookie remains', async () => {
    raw.mockRejectedValue(unauthorized())
    const request = event()
    request.headers.cookie = `${prefix}_access=expired-A`
    await Promise.resolve(handle(request)).catch(() => undefined)
    expect(request.cookies.join(' ')).toContain('Expires=Thu, 01 Jan 1970')
    expect(raw).toHaveBeenCalledOnce()
  })
  it('makes logout idempotent without a refresh cookie', async () => {
    const request = event('auth/logout', 'A', 'POST')
    request.headers.cookie = ''
    expect(await handle(request)).toEqual({ success: true })
    expect(raw).not.toHaveBeenCalled()
    expect(request.cookies).toHaveLength(2)
  })
})
