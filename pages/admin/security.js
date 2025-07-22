import { useState, useEffect } from 'react'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function AdminSecurity() {
  const [metrics, setMetrics] = useState({
    requests: 0,
    errors: 0,
    blockedIPs: 0,
    threatLevel: 'LOW',
    requestsPerHour: 0,
    errorRate: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSecurityMetrics()
    const interval = setInterval(fetchSecurityMetrics, 10000) // Update every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchSecurityMetrics = async () => {
    try {
      const response = await fetch('/api/admin/security-metrics', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch security metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getThreatLevelColor = (level) => {
    switch (level) {
      case 'HIGH': return 'text-red-600 bg-red-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  return (
    <AdminLayout>
      <Head>
        <title>Security Monitor - Admin</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Monitor</h1>
          <p className="text-gray-600">Real-time security metrics and threat monitoring</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center">
                <ShieldCheckIcon className="w-8 h-8 text-blue-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold">Threat Level</h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getThreatLevelColor(metrics.threatLevel)}`}>
                    {metrics.threatLevel}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Requests (24h)</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.requests}</p>
              <p className="text-sm text-gray-600">{metrics.requestsPerHour}/hour</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Blocked IPs</h3>
              <p className="text-3xl font-bold text-red-600">{metrics.blockedIPs}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Rate</h3>
              <p className="text-3xl font-bold text-orange-600">{metrics.errorRate}%</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Errors</h3>
              <p className="text-3xl font-bold text-red-600">{metrics.errors}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Security Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800">Rate Limiting</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800">Input Sanitization</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-green-800">Threat Detection</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}