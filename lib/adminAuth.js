// lib/adminAuth.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from './supabase'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export class AdminAuth {
  // Hash password
  static async hashPassword(password) {
    return await bcrypt.hash(password, 12)
  }

  // Verify password
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash)
  }

  // Generate JWT token
  static generateToken(adminId) {
    return jwt.sign(
      { adminId, type: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }

  // Create admin user
  static async createAdmin(email, password, role = 'moderator') {
    const passwordHash = await this.hashPassword(password)
    
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        email,
        password_hash: passwordHash,
        role
      })
      .select()

    if (error) {
      throw new Error(`Failed to create admin: ${error.message}`)
    }

    return data[0]
  }

  // Login admin
  static async login(email, password, ipAddress, userAgent) {
    // Get admin user
    const { data: admin, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (adminError || !admin) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, admin.password_hash)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Generate session token
    const token = this.generateToken(admin.id)
    const expiresAt = new Date(Date.now() + SESSION_DURATION)

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .insert({
        admin_id: admin.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent
      })
      .select()

    if (sessionError) {
      throw new Error('Failed to create session')
    }

    // Update last login
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id)

    // Log activity
    await this.logActivity(admin.id, 'login', 'system', null, { ip_address: ipAddress })

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role
      },
      token,
      expiresAt
    }
  }

  // Verify session
  static async verifySession(token) {
    if (!token) return null

    // Verify JWT
    const decoded = this.verifyToken(token)
    if (!decoded) return null

    // Check session in database
    const { data: session, error } = await supabase
      .from('admin_sessions')
      .select(`
        *,
        admin_users (
          id,
          email,
          role,
          is_active
        )
      `)
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !session || !session.admin_users.is_active) {
      return null
    }

    return {
      admin: session.admin_users,
      session
    }
  }

  // Logout
  static async logout(token) {
    if (!token) return

    // Remove session
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('token', token)
  }

  // Log admin activity
  static async logActivity(adminId, action, targetType = null, targetId = null, details = {}) {
    await supabase
      .from('admin_activity')
      .insert({
        admin_id: adminId,
        action,
        target_type: targetType,
        target_id: targetId,
        details,
        ip_address: details.ip_address || null
      })
  }

  // Clean expired sessions
  static async cleanupSessions() {
    await supabase
      .from('admin_sessions')
      .delete()
      .lt('expires_at', new Date().toISOString())
  }

  // Check if user has permission
  static hasPermission(userRole, requiredRole) {
    const roleHierarchy = {
      moderator: 1,
      admin: 2,
      super_admin: 3
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }
}

// Middleware for protecting admin routes
export function requireAdmin(requiredRole = 'moderator') {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.adminToken

      if (!token) {
        return res.status(401).json({ error: 'No authentication token' })
      }

      const auth = await AdminAuth.verifySession(token)
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      if (!AdminAuth.hasPermission(auth.admin.role, requiredRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      req.admin = auth.admin
      req.session = auth.session

      if (next) next()
      return auth
    } catch (error) {
      return res.status(500).json({ error: 'Authentication error' })
    }
  }
}