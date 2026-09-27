import type { FetchError, FetchResponse } from 'ofetch'
import type { H3Event } from 'h3'
import {
  defineEventHandler,
  getMethod,
  getRouterParam,
  getQuery,
  getHeaders,
  readBody,
  readRawBody,
  appendHeader,
  setResponseStatus,
  createError,
} from 'h3'

interface ProxyData extends Record<string, unknown> {
  access_token?: string
  refresh_token?: string
  data?: ProxyData
}

interface RefreshResult {
  accessToken: string | null
  newRefreshToken?: string
}

// Share only in-flight work for the same gateway and presented refresh credential.
// Cross-instance rotation is enforced atomically by the API; never share identities.
const refreshes = new Map<string, Promise<RefreshResult>>()

async function refreshSession(gateway: string, token: string): Promise<RefreshResult> {
  const key = `${gateway}\0${token}`
  const pending = refreshes.get(key)
  if (pending) return pending
  const request = refreshAccessToken(gateway, token)
  refreshes.set(key, request)
  try {
    return await request
  } finally {
    if (refreshes.get(key) === request) refreshes.delete(key)
  }
}

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(
  gatewayBaseUrl: string,
  refreshToken: string
): Promise<{ accessToken: string | null; newRefreshToken?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000) // 5 second timeout

  try {
    const response = await $fetch.raw<ProxyData>(`${gatewayBaseUrl}/auth/refresh`, {
      method: 'POST',
      retry: 0,
      timeout: 5000,
      body: { refreshToken },
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    const data = response._data?.data ?? response._data
    const accessToken = data?.access_token ?? null
    const newRefreshToken = data?.refresh_token

    console.log('[CMS Proxy] Token refresh successful')
    return { accessToken, newRefreshToken }
  } catch (caught: unknown) {
    const error = caught as FetchError<ProxyData>
    if (error?.name === 'AbortError' || (error?.cause as Error | undefined)?.name === 'AbortError') {
      console.error('[CMS Proxy] Token refresh timed out after 5s')
    } else {
      console.error('[CMS Proxy] Token refresh failed:', error?.statusCode || error?.message)
    }
    const status = error?.response?.status || error?.statusCode
    if (status === 401 || status === 403) return { accessToken: null }
    throw createError({ statusCode: 503, statusMessage: 'Session service temporarily unavailable. Please try again.' })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Extract tokens from cookies
 */
function getTokensFromCookies(cookieHeader: string | undefined): {
  accessToken: string | null
  refreshToken: string | null
} {
  if (!cookieHeader) return { accessToken: null, refreshToken: null }

  const accessMatch = cookieHeader.match(/(?:^|;\s*)cms_access=([^;]+)/)
  const refreshMatch = cookieHeader.match(/(?:^|;\s*)cms_refresh=([^;]+)/)

  return {
    accessToken: accessMatch?.[1] || null,
    refreshToken: refreshMatch?.[1] || null,
  }
}

/**
 * Build forward headers for API requests
 */
function buildForwardHeaders(
  headers: Record<string, string | string[] | undefined>,
  accessToken: string | null
): Record<string, string> {
  const forwardHeaders: Record<string, string> = {}

  if (headers['user-agent']) {
    forwardHeaders['user-agent'] = String(headers['user-agent'])
  }
  if (headers['content-type']) {
    forwardHeaders['content-type'] = String(headers['content-type'])
  }
  if (accessToken) {
    forwardHeaders.authorization = `Bearer ${accessToken}`
  }

  return forwardHeaders
}

/**
 * Set auth cookies on the response
 */
function setAuthCookies(
  event: H3Event,
  accessToken: string | null,
  refreshToken: string | null,
  isLocalhost: boolean
) {
  const secureFlag = isLocalhost ? '' : ' Secure;'

  if (accessToken) {
    // Access token: 15 min expiry
    appendHeader(
      event,
      'set-cookie',
      `cms_access=${accessToken}; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=900`
    )
  }
  if (refreshToken) {
    // Refresh token: 7 days expiry
    appendHeader(
      event,
      'set-cookie',
      `cms_refresh=${refreshToken}; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Max-Age=604800`
    )
  }
}

/**
 * Clear auth cookies
 */
function clearAuthCookies(event: H3Event, isLocalhost: boolean) {
  const secureFlag = isLocalhost ? '' : ' Secure;'
  appendHeader(
    event,
    'set-cookie',
    `cms_access=; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  )
  appendHeader(
    event,
    'set-cookie',
    `cms_refresh=; Path=/; HttpOnly;${secureFlag} SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  )
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const gatewayBaseUrl = config.apiUrl || config.public.apiUrl

  if (!gatewayBaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing API_URL runtime config',
    })
  }

  const path = getRouterParam(event, 'path') || ''
  const targetUrl = `${gatewayBaseUrl.replace(/\/$/, '')}/${path}`
  const method = getMethod(event)
  const query = getQuery(event)
  const headers = getHeaders(event)
  const contentType = headers['content-type'] || ''

  // Check if localhost for secure cookie flag
  const requestHost = headers.host || ''
  const isLocalhost = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestHost)

  // Get tokens from cookies
  const cookieHeader = headers.cookie
  let { accessToken, refreshToken } = getTokensFromCookies(cookieHeader)

  // Read body for non-GET/HEAD requests
  let body: BodyInit | Record<string, unknown> | null | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    if (contentType.includes('multipart/form-data')) {
      // Read raw body for file uploads - preserve binary data
      const rawBody = await readRawBody(event, false)
      body = rawBody ? new Uint8Array(rawBody).buffer : undefined
    } else {
      body = await readBody(event)
    }
  }

  // Revocation uses the HttpOnly credential, including after the access token expires.
  if (method === 'POST' && path === 'auth/logout') {
    clearAuthCookies(event, isLocalhost)
    if (!refreshToken) return { success: true }
    body = { refreshToken }
  }
  if (method === 'POST' && path === 'auth/refresh') {
    if (!refreshToken) throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })
    body = { refreshToken }
  }

  /**
   * Make the API request with given access token
   */
  async function makeRequest(token: string | null): Promise<{
    response: FetchResponse<ProxyData> | null
    error: FetchError<ProxyData> | null
    statusCode: number
  }> {
    const forwardHeaders = buildForwardHeaders(headers, token)

    try {
      const res = await $fetch.raw<ProxyData>(targetUrl, {
        method,
        retry: 0,
        timeout: 15000,
        query,
        body,
        headers: forwardHeaders,
      })
      return { response: res, error: null, statusCode: res.status }
    } catch (caught: unknown) {
      const fetchError = caught as FetchError<ProxyData>
      const statusCode = fetchError.response?.status || fetchError.statusCode || 500
      return { response: null, error: fetchError, statusCode }
    }
  }

  // First attempt
  let result = await makeRequest(accessToken)

  // Handle 401 - attempt token refresh (but not for auth endpoints)
  if (
    result.statusCode === 401 &&
    refreshToken &&
    !path.includes('auth/login') &&
    !path.includes('auth/refresh') &&
    !path.includes('auth/logout')
  ) {
    console.log(`[CMS Proxy] 401 on ${method} /${path}, attempting token refresh...`)

    const refreshed = await refreshSession(gatewayBaseUrl, refreshToken)
    if (refreshed.accessToken) {
      accessToken = refreshed.accessToken
      refreshToken = refreshed.newRefreshToken || refreshToken
      // Every waiting response needs its own cookies after rotation.
      setAuthCookies(event, accessToken, refreshToken, isLocalhost)
      result = await makeRequest(accessToken)
    } else {
      clearAuthCookies(event, isLocalhost)
    }
  }

  // Handle errors
  if (result.error) {
    if (result.statusCode === 401 && path !== 'auth/login' && path !== 'auth/logout') clearAuthCookies(event, isLocalhost)
    const errorData = result.error.response?._data || result.error.data
    const errorMessage = [errorData?.message, errorData?.error, result.error.message]
      .find((value): value is string => typeof value === 'string' && value.length > 0) || 'API request failed'

    if (result.statusCode !== 401) {
      console.error(`[CMS Proxy Error] ${method} ${targetUrl}:`, {
        status: result.statusCode,
        error: errorMessage,
      })
    }

    // Return error response instead of throwing (better for client handling)
    setResponseStatus(event, result.statusCode)
    return errorData || { message: errorMessage, statusCode: result.statusCode }
  }

  const res = result.response
  if (!res) throw createError({ statusCode: 502, statusMessage: 'Invalid API response' })

  const responseData = res._data
  const tokenData = responseData?.data ?? responseData
  if (method === 'POST' && (path === 'auth/login' || path === 'auth/refresh')) {
    if (tokenData?.access_token) {
      setAuthCookies(event, tokenData.access_token, tokenData.refresh_token ?? null, isLocalhost)
    }
  }
  // Tokens never leave the server proxy, including wrapped responses.
  for (const data of [responseData, responseData?.data]) {
    if (data && typeof data === 'object') {
      delete data.access_token
      delete data.refresh_token
    }
  }
  // Cookie ownership stays here; upstream headers must not undo a logout.

  setResponseStatus(event, res.status)
  return res._data
})
