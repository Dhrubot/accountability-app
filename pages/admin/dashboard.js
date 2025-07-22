// pages/admin/dashboard.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  UsersIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  DocumentArrowDownIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    cases: { total: 0, verified: 0, pending: 0, unverified: 0 },
    security: { requests: 0, blockedIPs: 0, threatLevel: 'LOW' },
    recent: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const [casesResponse, securityResponse] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/security-metrics', { credentials: 'include' })
      ])

      if (casesResponse.ok && securityResponse.ok) {
        const casesData = await casesResponse.json()
        const securityData = await securityResponse.json()

        setStats({
          cases: casesData,
          security: securityData,
          recent: casesData.recent || []
        })
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/export', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `voices-of-uttara-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const StatCard = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
    <div 
      className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color} ${onClick ? 'cursor-pointer hover:shadow-xl transition-all duration-200' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-', 'bg-').replace('-500', '-100')}`}>
          <Icon className={`w-6 h-6 ${color.replace('border-', 'text-')}`} />
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Head>
        <title>Admin Dashboard - Onushondhan</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of system status and activity</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={exportData}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <DocumentArrowDownIcon className="w-5 h-5" />
              <span>Export Data</span>
            </button>
            <button
              onClick={() => router.push('/admin/cases')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Verify Cases
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Cases"
            value={stats.cases.total}
            subtitle="All submissions"
            icon={UsersIcon}
            color="border-blue-500"
            onClick={() => router.push('/admin/cases')}
            key="Total Cases"
          />
          <StatCard
            title="Verified Cases"
            value={stats.cases.verified}
            subtitle={`${stats.cases.total > 0 ? Math.round((stats.cases.verified / stats.cases.total) * 100) : 0}% verified`}
            icon={CheckCircleIcon}
            color="border-green-500"
            onClick={() => router.push('/admin/cases?filter=verified')}
            key="Verified Cases"
          />
          <StatCard
            title="Pending Review"
            value={stats.cases.pending}
            subtitle="Awaiting verification"
            icon={ClockIcon}
            color="border-yellow-500"
            onClick={() => router.push('/admin/cases?filter=pending')}
            key="Pending Review"
          />
          <StatCard
            title="Security Threat"
            value={stats.security.threatLevel}
            subtitle={`${stats.security.blockedIPs} IPs blocked`}
            icon={ShieldExclamationIcon}
            color={stats.security.threatLevel === 'HIGH' ? 'border-red-500' : stats.security.threatLevel === 'MEDIUM' ? 'border-yellow-500' : 'border-green-500'}
            onClick={() => router.push('/admin/security')}
            key="Security Threat"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/cases?filter=unverified')}
              className="p-4 border-2 border-orange-200 rounded-lg hover:border-orange-300 transition-colors text-left"
              key="review-cases"
            >
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
                <div>
                  <p className="font-medium text-gray-900">Review New Cases</p>
                  <p className="text-sm text-gray-600">{stats.cases.unverified} unverified cases</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/security')}
              className="p-4 border-2 border-blue-200 rounded-lg hover:border-blue-300 transition-colors text-left"
              key="security-monitor"
            >
              <div className="flex items-center space-x-3">
                <ShieldExclamationIcon className="w-6 h-6 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Security Monitor</p>
                  <p className="text-sm text-gray-600">View system security</p>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/analytics')}
              className="p-4 border-2 border-purple-200 rounded-lg hover:border-purple-300 transition-colors text-left"
              key="view-analytics"
            >
              <div className="flex items-center space-x-3">
                <ChartBarIcon className="w-6 h-6 text-purple-500" />
                <div>
                  <p className="font-medium text-gray-900">View Analytics</p>
                  <p className="text-sm text-gray-600">Detailed statistics</p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Submissions</h2>
            <div className="space-y-3">
              {stats.recent.length > 0 ? (
                stats.recent.slice(0, 5).map((case_) => (
                  <div key={case_.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{case_.name}</p>
                      <p className="text-sm text-gray-600">
                        Status: <span className={`font-medium ${
                          case_.status === 'missing' ? 'text-yellow-600' :
                          case_.status === 'safe' ? 'text-green-600' :
                          case_.status === 'injured' ? 'text-orange-600' :
                          'text-gray-600'
                        }`}>{case_.status}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        case_.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                        case_.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {case_.verification_status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(case_.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent submissions</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database Status</span>
                <span className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Security Level</span>
                <span className={`flex items-center ${
                  stats.security.threatLevel === 'HIGH' ? 'text-red-600' :
                  stats.security.threatLevel === 'MEDIUM' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    stats.security.threatLevel === 'HIGH' ? 'bg-red-500' :
                    stats.security.threatLevel === 'MEDIUM' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}></div>
                  {stats.security.threatLevel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Requests (24h)</span>
                <span className="text-gray-900 font-medium">{stats.security.requests}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Blocked IPs</span>
                <span className="text-gray-900 font-medium">{stats.security.blockedIPs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Verification Progress</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{stats.cases.total > 0 ? Math.round(((stats.cases.verified + stats.cases.pending) / stats.cases.total) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${stats.cases.total > 0 ? ((stats.cases.verified + stats.cases.pending) / stats.cases.total) * 100 : 0}%` 
                  }}
                ></div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div key="verified">
                <p className="text-2xl font-bold text-green-600">{stats.cases.verified}</p>
                <p className="text-sm text-gray-600">Verified</p>
              </div>
              <div key="pending">
                <p className="text-2xl font-bold text-yellow-600">{stats.cases.pending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
              <div key="unverified">
                <p className="text-2xl font-bold text-gray-600">{stats.cases.unverified}</p>
                <p className="text-sm text-gray-600">Unverified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}