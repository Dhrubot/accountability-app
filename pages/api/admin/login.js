// pages/api/admin/login.js
import { AdminAuth } from '../../../lib/adminAuth'
import { securityManager } from '../../../lib/security'
import { logAdminActivity } from '../../../lib/supabase'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Rate limiting for login attempts - using centralized security manager
    if (!securityManager.checkRateLimit(ip, 'admin_login')) {
      // Log rate limiting event for audit trail
      await logAdminActivity('admin_login_rate_limited', {
        details: {
          ip_address: ip,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      })
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Too many login attempts. Please try again later.' })
    }

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Enhanced sanitization using security manager
    const cleanEmail = securityManager.sanitizeInput(email.trim()).toLowerCase()

    try {
      const result = await AdminAuth.login(
        cleanEmail,
        password,
        ip,
        req.headers['user-agent']
      )

      // Set secure cookie with enhanced security
      const cookieOptions = [
        `adminToken=${result.token}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        `Max-Age=${24 * 60 * 60}`, // 24 hours
        'Path=/'
      ].join('; ')

      res.setHeader('Set-Cookie', cookieOptions)

      // Log successful login for audit trail
      await logAdminActivity('admin_login_success', {
        admin_id: result.admin.id,
        details: {
          email: cleanEmail,
          ip_address: ip,
          user_agent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      })

      res.status(200).json({
        success: true,
        admin: result.admin,
        expiresAt: result.expiresAt
      })

    } catch (loginError) {
      // Enhanced error logging with detailed context
      await logAdminActivity('admin_login_failed', {
        details: {
          attempted_email: cleanEmail,
          ip_address: ip,
          user_agent: req.headers['user-agent'],
          error_message: loginError.message,
          timestamp: new Date().toISOString()
        }
      })

      // Send security alert for failed attempts
      await securityManager.sendAlert(
        `Failed admin login attempt: ${cleanEmail} from ${ip}`,
        { severity: 'medium', category: 'authentication' }
      )
      
      securityManager.updateMetrics('errors')

      // Provide specific error messages based on error type
      if (loginError.message === 'No admin access') {
        return res.status(403).json({ error: 'No admin access' })
      }
      
      return res.status(401).json({ error: 'Invalid email or password' })
    }

  } catch (error) {
    console.error('Admin login error:', error)
    
    // Log system errors for debugging
    await logAdminActivity('admin_login_system_error', {
      details: {
        error_message: error.message,
        stack_trace: error.stack,
        ip_address: ip,
        timestamp: new Date().toISOString()
      }
    })
    
    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Internal server error' })
  }
}