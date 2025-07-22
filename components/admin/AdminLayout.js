// components/admin/AdminLayout.js - Enhanced with cache control
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { 
  HomeIcon,
  UsersIcon,
  ShieldCheckIcon,
  DocumentChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  CogIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function AdminLayout({ children, requireFreshAuth = false }) {
  const [admin, setAdmin] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const router = useRouter()
  const notificationRef = useRef(null)

  useEffect(() => {
    checkAuth(requireFreshAuth)
    // Check for notifications
    checkNotifications()
    
    // Set up notification polling (every 30 seconds)
    const notificationInterval = setInterval(checkNotifications, 30000)
    
    // Click outside handler for notification dropdown
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    
    return () => {
      clearInterval(notificationInterval)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [requireFreshAuth])

  const checkAuth = async (useFresh = false) => {
    try {
      // Use fresh auth for sensitive operations
      const url = useFresh ? '/api/admin/verify?fresh=true' : '/api/admin/verify'
      
      const response = await fetch(url, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAdmin(data.admin)
        setAuthError(null)
        
        // Store in localStorage for quick access
        localStorage.setItem('adminInfo', JSON.stringify(data.admin))
      } else {
        const errorData = await response.json()
        setAuthError(errorData.error)
        
        // Clear stored admin info
        localStorage.removeItem('adminInfo')
        
        // Redirect to login if not authenticated
        if (response.status === 401) {
          router.push('/admin/login')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthError('Network error')
      
      // Try to use cached admin info if available
      const cachedAdmin = localStorage.getItem('adminInfo')
      if (cachedAdmin && !useFresh) {
        try {
          setAdmin(JSON.parse(cachedAdmin))
        } catch (e) {
          localStorage.removeItem('adminInfo')
          router.push('/admin/login')
        }
      } else {
        router.push('/admin/login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const checkNotifications = async () => {
    try {
      // This would check for pending cases, security alerts, etc.
      const response = await fetch('/api/admin/notifications', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      // Fail silently for notifications
      console.warn('Failed to fetch notifications:', error)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />
    }
  }

  const getNotificationBgColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'success':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const handleNotificationClick = (notification) => {
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
      setShowNotifications(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear all stored data
      localStorage.removeItem('adminInfo')
      setAdmin(null)
      
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout even if API fails
      localStorage.removeItem('adminInfo')
      setAdmin(null)
      router.push('/admin/login')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAuth = () => {
    setIsLoading(true)
    checkAuth(true) // Force fresh auth
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    { name: 'Cases', href: '/admin/cases', icon: UsersIcon },
    { name: 'Security', href: '/admin/security', icon: ShieldCheckIcon },
    { name: 'Analytics', href: '/admin/analytics', icon: DocumentChartBarIcon },
  ]

  // Add admin management for admins and super admins
  if (admin?.role && ['admin', 'super_admin'].includes(admin.role)) {
    navigation.push({
      name: 'Admin Users',
      href: '/admin/users',
      icon: CogIcon
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {requireFreshAuth ? 'Verifying permissions...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show auth error if present
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-red-700">Authentication Error</h2>
          </div>
          <p className="text-gray-600 mb-6">{authError}</p>
          <div className="flex space-x-3">
            <button
              onClick={refreshAuth}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/admin/login')}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Login Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Show fresh auth warning if enabled */}
      {requireFreshAuth && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-700">
              This page requires fresh authentication for security.
            </p>
          </div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex flex-col w-64 bg-white h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col bg-white border-r border-gray-200 shadow-lg">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold">V</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
              <p className="text-xs text-gray-500">Voices of Uttara</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Admin info */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {admin?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{admin?.email}</p>
                <div className="flex items-center">
                  <p className="text-xs text-gray-500 capitalize">{admin?.role}</p>
                  {requireFreshAuth && (
                    <div className="ml-2 w-2 h-2 bg-green-500 rounded-full" title="Fresh authentication verified"></div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <div className="ml-4 md:ml-0">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">System Operational</span>
                  {requireFreshAuth && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Fresh Auth
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-400 hover:text-gray-600 relative transition-colors"
                >
                  <BellIcon className="w-6 h-6" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-medium">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Notifications ({notifications.length})
                        </h3>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          <BellIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No new notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${getNotificationBgColor(notification.type)}`}
                            onClick={() => handleNotificationClick(notification)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notification.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {notification.title}
                                  </p>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {formatNotificationTime(notification.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {notification.message}
                                </p>
                                {notification.actionUrl && (
                                  <div className="mt-2">
                                    <span className="inline-flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium">
                                      View Details →
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                        <button
                          onClick={() => {
                            setNotifications([])
                            setShowNotifications(false)
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Clear all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Refresh auth button for sensitive pages */}
              {requireFreshAuth && (
                <button
                  onClick={refreshAuth}
                  className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                  disabled={isLoading}
                >
                  Refresh Auth
                </button>
              )}

              {/* Quick actions */}
              <Link
                href="/"
                target="_blank"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Site
              </Link>

              {/* Mobile admin info */}
              <div className="md:hidden flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {admin?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}