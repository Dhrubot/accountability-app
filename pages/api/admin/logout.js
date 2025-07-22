// pages/api/admin/logout.js
import { AdminAuth } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                 req.cookies?.adminToken

    if (token) {
      await AdminAuth.logout(token)
    }

    // Clear cookie
    res.setHeader('Set-Cookie', [
      'adminToken=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
    ])

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Logout failed' })
  }
}