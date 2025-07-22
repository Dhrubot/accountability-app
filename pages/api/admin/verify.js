// pages/api/admin/verify.js
import { AdminAuth } from '../../../lib/adminAuth'
import { securityManager } from '../../../lib/security'
import { logAdminActivity } from '../../../lib/supabase'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Rate limiting for verification requests to prevent token brute force
    if (!securityManager.checkRateLimit(ip, 'admin_verify', 100, 60000)) { // 100 per minute
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Too many verification requests' })
    }

    const token = req.headers.authorization?.replace('Bearer ', '') || 
                 req.cookies?.adminToken

    if (!token) {
      // Log authentication attempts without tokens for security monitoring
      await logAdminActivity('admin_verify_no_token', {
        details: {
          ip_address: ip,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      })
      return res.status(401).json({ error: 'No token provided' })
    }

    // Check if we should bypass cache for sensitive operations
    const useCache = req.query.fresh !== 'true'
    const bypassCache = req.query.fresh === 'true'

    const auth = await AdminAuth.verifySession(token, useCache)
    
    if (!auth) {
      // Log failed verification attempts for security monitoring
      await logAdminActivity('admin_verify_invalid', {
        details: {
          ip_address: ip,
          user_agent: req.headers['user-agent'],
          bypass_cache: bypassCache,
          timestamp: new Date().toISOString()
        }
      })

      // Send security alert for potentially compromised tokens
      await securityManager.sendAlert(
        `Invalid admin token verification attempt from ${ip}`,
        { severity: 'medium', category: 'authentication' }
      )

      securityManager.updateMetrics('invalid_tokens')
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Log successful verifications periodically (not every request to reduce noise)
    const shouldLog = Math.random() < 0.1 || bypassCache; // 10% sampling or when fresh data requested
    if (shouldLog) {
      await logAdminActivity('admin_verify_success', {
        admin_id: auth.admin.id,
        details: {
          email: auth.admin.email,
          ip_address: ip,
          user_agent: req.headers['user-agent'],
          bypass_cache: bypassCache,
          timestamp: new Date().toISOString()
        }
      })
    }

    // Update metrics for successful verifications
    securityManager.updateMetrics('admin_verify_success')

    // Set cache control headers based on verification type
    if (bypassCache) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    } else {
      res.setHeader('Cache-Control', 'private, max-age=300') // 5 minutes for cached verifications
    }

    res.status(200).json({
      authenticated: true,
      admin: {
        id: auth.admin.id,
        email: auth.admin.email,
        role: auth.admin.role,
        permissions: auth.admin.permissions
      },
      expiresAt: auth.expiresAt,
      fromCache: useCache && !bypassCache
    })

  } catch (error) {
    console.error('Verify error:', error)

    // Log system errors for debugging
    await logAdminActivity('admin_verify_system_error', {
      details: {
        error_message: error.message,
        stack_trace: error.stack,
        ip_address: ip,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    })

    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Verification failed' })
  }
}