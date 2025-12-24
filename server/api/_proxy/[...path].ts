export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const gatewayBaseUrl = config.public.apiUrl

  if (!gatewayBaseUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Missing runtimeConfig.public.apiUrl' })
  }

  const path = getRouterParam(event, 'path') || ''
  const targetUrl = `${gatewayBaseUrl.replace(/\/$/, '')}/${path}`

  const method = getMethod(event)
  const query = getQuery(event)
  const headers = getHeaders(event)

  // Forward incoming cookies to the gateway (SSR requests)
  const cookie = headers.cookie

  // Forward body for non-GET/HEAD
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(event)

  // Debug logging
  console.log(`[Proxy] ${method} ${targetUrl}`)
  console.log(`[Proxy] Auth header present: ${!!headers.authorization}`)

  try {
    const res = await $fetch.raw(targetUrl, {
      method,
      query,
      body,
      headers: {
        // Do not forward host/connection headers
        ...(cookie ? { cookie } : {}),
        // Optional: forward user-agent for logging/debug
        ...(headers['user-agent'] ? { 'user-agent': headers['user-agent'] } : {}),
        // Preserve content-type if present
        ...(headers['content-type'] ? { 'content-type': headers['content-type'] } : {}),
        // Forward authorization if present
        ...(headers.authorization ? { authorization: headers.authorization } : {}),
      },
    })

    console.log(`[Proxy] Response status: ${res.status}`)

    // IMPORTANT: forward Set-Cookie back to the browser on login/refresh/logout
    const setCookie = res.headers.getSetCookie?.() ?? (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')!] : [])
    for (const cookieValue of setCookie) {
      appendHeader(event, 'set-cookie', cookieValue)
    }

    // Mirror gateway status + response body
    setResponseStatus(event, res.status)
    return res._data
  }
  catch (error: unknown) {
    console.error(`[Proxy] Error:`, error)
    
    // Handle fetch errors (e.g., network issues, non-2xx responses)
    if (error && typeof error === 'object' && 'response' in error) {
      const fetchError = error as { response?: { status?: number; _data?: unknown } }
      const status = fetchError.response?.status || 500
      const data = fetchError.response?._data || { message: 'Proxy error' }
      console.error(`[Proxy] Error response:`, status, data)
      setResponseStatus(event, status)
      return data
    }
    throw createError({ statusCode: 500, statusMessage: 'Proxy request failed' })
  }
})
