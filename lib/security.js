// lib/security.js - FIXED VERSION
import CryptoJS from 'crypto-js'
import DOMPurify from 'isomorphic-dompurify'

export class SecurityManager {
  constructor() {
    this.rateLimit = new Map()
    this.suspiciousIPs = new Set()
    this.failedAttempts = new Map()
    this.metrics = {
      requests: 0,
      errors: 0,
      submissions: 0,
      blockedIPs: 0,
      lastReset: Date.now()
    }
    
    // Clean up old entries every hour
    setInterval(() => this.cleanup(), 3600000)
  }

  // Rate limiting
  checkRateLimit(ip, action = 'general') {
    const key = `${ip}_${action}`
    const now = Date.now()
    const hourAgo = now - 3600000
    
    if (!this.rateLimit.has(key)) {
      this.rateLimit.set(key, [])
    }
    
    const attempts = this.rateLimit.get(key)
    const recentAttempts = attempts.filter(time => time > hourAgo)
    
    const limits = {
      general: 100,
      submission: 5,
      search: 50,
      admin_login: 10
    }
    
    if (recentAttempts.length >= limits[action]) {
      this.flagSuspiciousIP(ip)
      return false
    }
    
    recentAttempts.push(now)
    this.rateLimit.set(key, recentAttempts)
    return true
  }

  // Input sanitization
  sanitizeInput(input) {
    if (typeof input !== 'string') return ''
    
    // Remove scripts and dangerous content
    let cleaned = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    })
    
    // Additional cleaning
    cleaned = cleaned
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim()
      .substring(0, 500) // Length limit
    
    return cleaned
  }

  // Data integrity hashing
  hashData(data) {
    const timestamp = Date.now()
    const dataString = JSON.stringify({ ...data, timestamp })
    return CryptoJS.SHA256(dataString).toString()
  }

  // Threat detection
  detectThreats(req) {
    const ip = this.getClientIP(req)
    const suspicious = [
      req.body && JSON.stringify(req.body).length > 10000, // Large payloads
      this.containsMaliciousContent(req.body),
      this.failedAttempts.get(ip) > 10,
      req.headers['user-agent']?.toLowerCase().includes('bot') && !this.isLegitBot(req.headers['user-agent'])
    ].filter(Boolean)

    if (suspicious.length > 0) {
      this.flagSuspiciousIP(ip)
      this.sendAlert(`Suspicious activity from ${ip}: ${suspicious.join(', ')}`)
      return true
    }
    return false
  }

  containsMaliciousContent(body) {
    if (!body) return false
    const content = JSON.stringify(body).toLowerCase()
    const patterns = [
      /<script/,
      /javascript:/,
      /on\w+\s*=/,
      /eval\(/,
      /exec\(/,
      /union.*select/,
      /drop.*table/,
      /insert.*into/
    ]
    return patterns.some(pattern => pattern.test(content))
  }

  isLegitBot(userAgent) {
    const legitBots = ['googlebot', 'bingbot', 'slurp', 'duckduckbot']
    return legitBots.some(bot => userAgent.toLowerCase().includes(bot))
  }

  flagSuspiciousIP(ip) {
    this.suspiciousIPs.add(ip)
    this.metrics.blockedIPs = this.suspiciousIPs.size
    
    const attempts = this.failedAttempts.get(ip) || 0
    this.failedAttempts.set(ip, attempts + 1)
  }

  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           '127.0.0.1'
  }

  updateMetrics(type) {
    this.metrics[type]++
    this.metrics.lastUpdated = Date.now()
  }

  // FIXED: Calculate threat level without calling getMetrics()
  calculateThreatLevel() {
    const blockedIPs = this.metrics.blockedIPs
    const requests = this.metrics.requests
    const errors = this.metrics.errors
    const errorRate = requests > 0 ? (errors / requests * 100) : 0
    
    if (blockedIPs > 50 || errorRate > 20) return 'HIGH'
    if (blockedIPs > 10 || errorRate > 10) return 'MEDIUM'
    return 'LOW'
  }

  // FIXED: Get metrics without circular reference
  getMetrics() {
    const hoursSinceReset = (Date.now() - this.metrics.lastReset) / 3600000
    const requestsPerHour = hoursSinceReset > 0 ? Math.round(this.metrics.requests / hoursSinceReset) : 0
    const errorRate = this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0
    
    return {
      ...this.metrics,
      requestsPerHour,
      errorRate,
      threatLevel: this.calculateThreatLevel() // Now safe to call
    }
  }

  async sendAlert(message) {
    try {
      // Discord webhook alert
      if (process.env.DISCORD_WEBHOOK_URL) {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🚨 SECURITY ALERT: ${message}`,
            timestamp: new Date().toISOString()
          })
        })
      }
      
      console.log(`[SECURITY ALERT] ${message}`)
    } catch (error) {
      console.error('Failed to send security alert:', error)
    }
  }

  cleanup() {
    const hourAgo = Date.now() - 3600000
    
    // Clean rate limit data
    for (const [key, attempts] of this.rateLimit.entries()) {
      const recentAttempts = attempts.filter(time => time > hourAgo)
      if (recentAttempts.length === 0) {
        this.rateLimit.delete(key)
      } else {
        this.rateLimit.set(key, recentAttempts)
      }
    }
    
    // Reset metrics daily
    if (Date.now() - this.metrics.lastReset > 86400000) {
      this.metrics = {
        requests: 0,
        errors: 0,
        submissions: 0,
        blockedIPs: this.suspiciousIPs.size,
        lastReset: Date.now()
      }
    }
  }
}

// Create singleton instance
export const securityManager = new SecurityManager()