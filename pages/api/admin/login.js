// pages/api/admin/login.js
import { AdminAuth } from '../../../lib/adminAuth'
import { securityManager } from '../../../lib/security'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Rate limiting for login attempts
    if (!securityManager.checkRateLimit(ip, 'admin_login')) {
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Too many login attempts' })
    }

    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Sanitize email
    const cleanEmail = securityManager.sanitizeInput(email).toLowerCase()

    try {
      const result = await AdminAuth.login(
        cleanEmail,
        password,
        ip,
        req.headers['user-agent']
      )

      // Set secure cookie
      const cookieOptions = [
        `adminToken=${result.token}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        `Max-Age=${24 * 60 * 60}`, // 24 hours
        'Path=/'
      ].join('; ')

      res.setHeader('Set-Cookie', cookieOptions)

      res.status(200).json({
        success: true,
        admin: result.admin,
        expiresAt: result.expiresAt
      })

    } catch (loginError) {
      // Log failed login attempt
      await securityManager.sendAlert(`Failed admin login attempt: ${cleanEmail} from ${ip}`)
      
      securityManager.updateMetrics('errors')
      return res.status(401).json({ error: 'Invalid credentials' })
    }

  } catch (error) {
    console.error('Admin login error:', error)
    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Internal server error' })
  }
}