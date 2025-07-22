
// pages/api/admin/verify.js
import { AdminAuth } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                 req.cookies?.adminToken

    const auth = await AdminAuth.verifySession(token)
    
    if (!auth) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    res.status(200).json({
      authenticated: true,
      admin: auth.admin
    })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({ error: 'Verification failed' })
  }
}