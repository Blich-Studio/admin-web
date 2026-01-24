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

// In-memory state for token refresh coordination
let isRefreshing = false
let refreshPromise: Promise<string | null> | null = null

/**
 * Attempt to refresh the access token using the refresh token
 */
async function refreshAccessToken(
  gatewayBaseUrl: string,
  refreshToken: string
): Promise<{ accessToken: string | null; newRefreshToken?: string }> {
  try {
    const response = await $fetch.raw(`${gatewayBaseUrl}/auth/refresh`, {
      method: 'POST',
      body: { refreshToken },
      headers: { 'Content-Type': 'application/json' },
    })

    const data = response._data as any
    const accessToken = data?.access_token ?? null
    const newRefreshToken = data?.refresh_token

    console.log('[CMS Proxy] Token refresh successful')
    return { accessToken, newRefreshToken }
  } catch (error: any) {
    console.error('[CMS Proxy] Token refresh failed:', error?.statusCode || error?.message)
    return { accessToken: null }
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

  const accessMatch = cookieHeader.match(/cms_access=([^;]+)/)
  const refreshMatch = cookieHeader.match(/cms_refresh=([^;]+)/)

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
  event: any,
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
function clearAuthCookies(event: any, isLocalhost: boolean) {
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
  const isLocalhost = requestHost.startsWith('localhost') || requestHost.startsWith('127.0.0.1')

  // Get tokens from cookies
  const cookieHeader = headers.cookie
  let { accessToken, refreshToken } = getTokensFromCookies(cookieHeader)

  // Read body for non-GET/HEAD requests
  let body: BodyInit | Record<string, unknown> | null | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    if (contentType.includes('multipart/form-data')) {
      // Read raw body for file uploads - preserve binary data
      body = (await readRawBody(event, false)) ?? undefined
    } else {
      body = await readBody(event)
    }
  }

  /**
   * Make the API request with given access token
   */
  async function makeRequest(token: string | null): Promise<{
    response: any | null
    error: any | null
    statusCode: number
  }> {
    const forwardHeaders = buildForwardHeaders(headers, token)

    try {
      const res = await $fetch.raw(targetUrl, {
        method,
        query,
        body,
        headers: forwardHeaders,
      })
      return { response: res, error: null, statusCode: res.status }
    } catch (fetchError: any) {
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

    // Coordinate refresh attempts to prevent thundering herd
    if (!isRefreshing) {
      isRefreshing = true
      refreshPromise = (async () => {
        try {
          const refreshResult = await refreshAccessToken(gatewayBaseUrl, refreshToken!)
          if (refreshResult.accessToken) {
            accessToken = refreshResult.accessToken
            if (refreshResult.newRefreshToken) {
              refreshToken = refreshResult.newRefreshToken
            }
            setAuthCookies(event, accessToken, refreshToken, isLocalhost)
            return accessToken
          }
          return null
        } finally {
          isRefreshing = false
          refreshPromise = null
        }
      })()
    }

    const newAccessToken = refreshPromise ? await refreshPromise : null

    if (newAccessToken) {
      console.log(`[CMS Proxy] Token refreshed, retrying ${method} /${path}...`)
      accessToken = newAccessToken
      result = await makeRequest(accessToken)
    } else {
      console.log('[CMS Proxy] Token refresh failed, clearing auth cookies')
      clearAuthCookies(event, isLocalhost)
    }
  }

  // Handle errors
  if (result.error) {
    const errorData = result.error.response?._data || result.error.data
    const errorMessage =
      errorData?.message || errorData?.error || result.error.message || 'API request failed'

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

  // Process successful response - extract and store tokens from login/refresh
  try {
    const responseData = res._data as any
    const newAccessToken = responseData?.data?.access_token ?? responseData?.access_token
    const newRefreshToken = responseData?.data?.refresh_token ?? responseData?.refresh_token

    if (newAccessToken) {
      setAuthCookies(event, newAccessToken, newRefreshToken, isLocalhost)

      // Keep tokens in response for CMS (needed for localStorage backup)
      // But mark that cookies are set
      if (responseData) {
        responseData._cookiesSet = true
      }
    }

    // Clear cookies on logout
    if (method === 'POST' && path.endsWith('auth/logout')) {
      clearAuthCookies(event, isLocalhost)
    }
  } catch (e) {
    // Ignore response processing errors
  }

  // Forward Set-Cookie headers from upstream
  const setCookieHeaders =
    res.headers.getSetCookie?.() ??
    (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')!] : [])

  for (const cookieValue of setCookieHeaders) {
    appendHeader(event, 'set-cookie', cookieValue)
  }

  setResponseStatus(event, res.status)
  return res._data
})
