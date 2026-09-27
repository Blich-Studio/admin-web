import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../app/stores/auth'

const session = { userId: 'writer-id', email: 'writer@example.test', role: 'writer' }
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  setActivePinia(createPinia())
  vi.stubGlobal('localStorage', { removeItem: vi.fn(), setItem: vi.fn(), getItem: vi.fn(() => 'untrusted-legacy-admin') })
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

describe('CMS cookie session', () => {
  it('restores identity from the server and clears legacy token storage', async () => {
    vi.mocked(fetch).mockResolvedValue(response(session))
    const store = useAuthStore()
    await store.restore()
    expect(store.user).toEqual({ id: session.userId, email: session.email, role: 'writer' })
    expect(store.isAdmin).toBe(false)
    expect(fetch).toHaveBeenCalledWith('/api/_proxy/auth/me', { credentials: 'include' })
    expect(localStorage.removeItem).toHaveBeenCalledWith('cms_auth_token')
    expect(localStorage.getItem).not.toHaveBeenCalled()
    expect(localStorage.setItem).not.toHaveBeenCalled()
    expect(store.$state).not.toHaveProperty('token')
    await store.restore()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('logs in using cookies and a separate authoritative profile request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({ success: true })).mockResolvedValueOnce(response(session))
    const store = useAuthStore()
    await expect(store.login('writer@example.test', 'example-password')).resolves.toBe(true)
    expect(store.isWriter).toBe(true)
    expect(localStorage.setItem).not.toHaveBeenCalled()
    expect(fetch).toHaveBeenNthCalledWith(1, '/api/_proxy/auth/login', expect.objectContaining({ credentials: 'include', body: JSON.stringify({ email: 'writer@example.test', password: 'example-password' }) }))
  })

  it('rejects reader access and clears the newly established session', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(response({})).mockResolvedValueOnce(response({ ...session, role: 'reader' })).mockResolvedValueOnce(response({ success: true }))
    const store = useAuthStore()
    await expect(store.login('reader@example.test', 'example-password')).rejects.toThrow('writers and admins')
    expect(store.user).toBeNull()
    expect(fetch).toHaveBeenLastCalledWith('/api/_proxy/auth/logout', { method: 'POST', credentials: 'include' })
  })

  it('does not restore a rejected session from stale browser identity', async () => {
    vi.mocked(fetch).mockResolvedValue(response({}, 401))
    const store = useAuthStore()
    await store.restore()
    expect(store.isAuthenticated).toBe(false)
    expect(store.initialized).toBe(true)
  })

  it('clears local identity even if logout is unavailable or storage is blocked', async () => {
    const store = useAuthStore()
    store.user = { id: 'writer-id', email: session.email, role: 'writer' }
    vi.mocked(localStorage.removeItem).mockImplementation(() => { throw new Error('Storage disabled') })
    vi.mocked(fetch).mockRejectedValue(new Error('Network unavailable'))
    await store.logout()
    expect(store.user).toBeNull()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
