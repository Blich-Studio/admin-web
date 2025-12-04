export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) return
  
  const queryParams = Object.values(to.query || {})
  const hasSuspiciousInput = queryParams.some(param => 
    typeof param === 'string' && (
      param.includes('<') || 
      param.includes('script') || 
      param.length > 1000
    )
  )
  
  if (hasSuspiciousInput) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'Invalid input detected' 
    })
  }
})
