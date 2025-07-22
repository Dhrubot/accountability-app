// pages/api/admin/logout.js
import { AdminAuth } from '../../../lib/adminAuth'
import { securityManager } from '../../../lib/security'
import { logAdminActivity, getCurrentUser } from '../../../lib/supabase'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                 req.cookies?.adminToken

    let userId = null
    let userEmail = null

    // Try to get user information for logging before logout
    if (token) {
      try {
        const user = await getCurrentUser()
        userId = user?.id
        userEmail = user?.email
      } catch (e) {
        // Continue with logout even if we can't get user info
        console.warn('Could not retrieve user info during logout:', e.message)
      }

      // Perform logout with enhanced cleanup
      await AdminAuth.logout(token, userId)
    }

    // Clear cookie with secure settings
    res.setHeader('Set-Cookie', [
      'adminToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ])

    // Log successful logout for audit trail
    await logAdminActivity('admin_logout_success', {
      admin_id: userId,
      details: {
        email: userEmail,
        ip_address: ip,
        user_agent: req.headers['user-agent'],
        had_token: !!token,
        timestamp: new Date().toISOString()
      }
    })

    // Update security metrics
    securityManager.updateMetrics('admin_logout')

    res.status(200).json({ success: true })

  } catch (error) {
    console.error('Logout error:', error)

    // Log logout errors for debugging
    await logAdminActivity('admin_logout_error', {
      admin_id: userId,
      details: {
        error_message: error.message,
        ip_address: ip,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    })

    securityManager.updateMetrics('errors')

    // Still clear the cookie even if logout failed
    res.setHeader('Set-Cookie', [
      'adminToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ])

    res.status(500).json({ error: 'Logout failed' })
  }
}