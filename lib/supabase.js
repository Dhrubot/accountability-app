// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for frontend (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Admin client for backend operations (service role key)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// =============================================
// CACHING SYSTEM
// =============================================

// Admin status cache with TTL (Time To Live)
class AdminCache {
  constructor(ttlMinutes = 15) {
    this.cache = new Map()
    this.ttl = ttlMinutes * 60 * 1000 // Convert to milliseconds
  }

  set(userId, data) {
    this.cache.set(userId, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + this.ttl
    })
  }

  get(userId) {
    const entry = this.cache.get(userId)
    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(userId)
      return null
    }

    return entry.data
  }

  delete(userId) {
    this.cache.delete(userId)
  }

  clear() {
    this.cache.clear()
    if (process.env.NODE_ENV === 'development') {
      console.log('Admin cache cleared')
    }
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now()
    for (const [userId, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(userId)
      }
    }
  }

  // Get cache stats for debugging
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([userId, entry]) => ({
        userId,
        role: entry.data?.role,
        expiresIn: Math.max(0, entry.expires - Date.now()),
        expired: Date.now() > entry.expires
      }))
    }
  }
}

// Create cache instance
const adminCache = new AdminCache(15) // 15 minutes TTL

// Clean up expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    adminCache.cleanup()
  }, 5 * 60 * 1000)
}

// =============================================
// HELPER FUNCTIONS
// =============================================

// Helper function to get authenticated user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Enhanced helper function to check if user is admin with caching
export const checkAdminStatus = async (userId = null, useCache = true) => {
  try {
    const targetUserId = userId || (await getCurrentUser())?.id
    if (!targetUserId) return null

    // Check cache first if enabled
    if (useCache) {
      const cachedResult = adminCache.get(targetUserId)
      if (cachedResult) {
        return cachedResult
      }
    }

    // Fetch from database
    const { data: adminRole, error } = await supabase
      .from('admin_roles')
      .select('role, is_active')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single()

    let result = null

    if (!error && adminRole) {
      result = {
        userId: targetUserId,
        role: adminRole.role,
        isActive: adminRole.is_active,
        cachedAt: new Date().toISOString()
      }
    }

    // Cache the result (even if null, to avoid repeated DB calls)
    if (useCache) {
      adminCache.set(targetUserId, result)
    }

    return result
  } catch (error) {
    console.error('Check admin status error:', error)
    return null
  }
}

// Helper function to check role hierarchy
export const hasMinimumRole = async (requiredRole, userId = null, useCache = true) => {
  const adminStatus = await checkAdminStatus(userId, useCache)
  if (!adminStatus) return false
  
  const roleHierarchy = {
    'moderator': 1,
    'admin': 2, 
    'super_admin': 3
  }
  
  const userRoleLevel = roleHierarchy[adminStatus.role] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole] || 0
  
  return userRoleLevel >= requiredRoleLevel
}

// Helper function to invalidate admin cache (useful after role changes)
const invalidateAdminCache = (userId = null) => {
  if (userId) {
    adminCache.delete(userId)
  } else {
    adminCache.clear()
  }
}

// Helper function to refresh admin status (bypass cache)
const refreshAdminStatus = async (userId = null) => {
  const targetUserId = userId || (await getCurrentUser())?.id
  if (targetUserId) {
    invalidateAdminCache(targetUserId)
  }
  return await checkAdminStatus(userId, false) // Force fresh fetch
}

// Helper function for admin middleware/guards
const requireAdminRole = async (minimumRole = 'moderator', userId = null) => {
  const hasRole = await hasMinimumRole(minimumRole, userId)
  if (!hasRole) {
    throw new Error(`Access denied. Requires ${minimumRole} role or higher.`)
  }
  return await checkAdminStatus(userId)
}

// Bulk admin status check (useful for user lists)
const bulkCheckAdminStatus = async (userIds, useCache = true) => {
  const results = {}
  
  // Check cache first
  if (useCache) {
    userIds.forEach(userId => {
      const cached = adminCache.get(userId)
      if (cached !== null) {
        results[userId] = cached
      }
    })
  }

  // Get remaining userIds that weren't cached
  const uncachedUserIds = userIds.filter(id => !(id in results))
  
  if (uncachedUserIds.length > 0) {
    try {
      const { data: adminRoles, error } = await supabase
        .from('admin_roles')
        .select('user_id, role, is_active')
        .in('user_id', uncachedUserIds)
        .eq('is_active', true)

      if (!error && adminRoles) {
        // Process results
        uncachedUserIds.forEach(userId => {
          const adminRole = adminRoles.find(role => role.user_id === userId)
          const result = adminRole ? {
            userId,
            role: adminRole.role,
            isActive: adminRole.is_active,
            cachedAt: new Date().toISOString()
          } : null

          results[userId] = result
          
          // Cache individual results
          if (useCache) {
            adminCache.set(userId, result)
          }
        })
      } else {
        // Set null for failed lookups
        uncachedUserIds.forEach(userId => {
          results[userId] = null
          if (useCache) {
            adminCache.set(userId, null)
          }
        })
      }
    } catch (error) {
      console.error('Bulk admin status check error:', error)
      // Set null for all uncached users on error
      uncachedUserIds.forEach(userId => {
        results[userId] = null
      })
    }
  }

  return results
}

// =============================================
// ADMIN UTILITIES
// =============================================

// Get current admin info with full details
const getCurrentAdminInfo = async () => {
  try {
    const user = await getCurrentUser()
    if (!user) return null

    const adminStatus = await checkAdminStatus(user.id)
    if (!adminStatus) return null

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      },
      admin: adminStatus
    }
  } catch (error) {
    console.error('Get current admin info error:', error)
    return null
  }
}

// Log admin activity (useful for audit trails)
const logAdminActivity = async (action, details = {}, adminId = null) => {
  try {
    if (!supabaseAdmin) {
      console.warn('Service role key not available for logging')
      return
    }

    // If adminId is provided (from server-side API routes), use it directly
    let targetAdminId = adminId
    
    // If no adminId provided, try to get from client session (for client-side usage)
    if (!targetAdminId) {
      try {
        const user = await getCurrentUser()
        if (!user) return
        
        const adminStatus = await checkAdminStatus(user.id)
        if (!adminStatus) return // Only log if user is actually an admin
        
        targetAdminId = user.id
      } catch (error) {
        // Fail silently for client-side session issues
        console.warn('Could not get user for admin activity logging:', error.message)
        return
      }
    }

    const { error } = await supabaseAdmin
      .from('admin_activity')
      .insert({
        admin_id: targetAdminId,
        action,
        details: {
          ...details,
          user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
          timestamp: new Date().toISOString()
        }
      })

    if (error) {
      console.error('Log admin activity error:', error)
    }
  } catch (error) {
    console.error('Log admin activity error:', error)
  }
}

// =============================================
// DEBUG UTILITIES (Development only)
// =============================================

// Debug function to inspect cache (development only)
const debugAdminCache = () => {
  if (process.env.NODE_ENV === 'development') {
    const stats = adminCache.getStats()
    console.table(stats.entries)
    return stats
  }
  return null
}

// Clear cache manually (development only)
const clearAdminCache = () => {
  if (process.env.NODE_ENV === 'development') {
    adminCache.clear()
    console.log('Admin cache cleared')
  }
}

// =============================================
// EXPORTS
// =============================================

export {
  // Cache utilities
  invalidateAdminCache,
  refreshAdminStatus,
  requireAdminRole,
  bulkCheckAdminStatus,
  
  // Admin utilities
  getCurrentAdminInfo,
  logAdminActivity,
  
  // Debug utilities (development only)
  debugAdminCache,
  clearAdminCache
}