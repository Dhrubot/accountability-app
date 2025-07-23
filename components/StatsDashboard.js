// components/StatsDashboard.js
import { useState, useEffect } from 'react'

export default function StatsDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    missing: 0,
    injured: 0,
    deceased: 0,
    safe: 0,
    verified: 0,
    pending: 0
  })
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true)
      }
      
      // Use fresh=true for manual refreshes to bypass cache
      const freshParam = isManualRefresh ? '?fresh=true' : ''
      
      const response = await fetch(`/api/stats${freshParam}`, {
        headers: {
          'Cache-Control': isManualRefresh ? 'no-cache' : 'max-age=300'
        }
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Show cache status in console for debugging
        if (data.cached) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📦 Stats served from cache (${data.cacheAge}s old)`)
          }
        }
        
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
      if (isManualRefresh) {
        setIsRefreshing(false)
      }
    }
  }

  const handleRefresh = () => {
    fetchStats(true)
  }

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>
  }

  const statCards = [
    { label: 'Total Cases', value: stats.total, color: 'bg-blue-100 text-blue-800' },
    { label: 'Missing', value: stats.missing, color: 'bg-yellow-100 text-yellow-800' },
    { label: 'Injured', value: stats.injured, color: 'bg-orange-100 text-orange-800' },
    { label: 'Deceased', value: stats.deceased, color: 'bg-red-100 text-red-800' },
    { label: 'Safe', value: stats.safe, color: 'bg-green-100 text-green-800' },
    { label: 'Verified', value: stats.verified, color: 'bg-purple-100 text-purple-800' },
    { label: 'Pending', value: stats.pending, color: 'bg-gray-100 text-gray-800' }
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Real-time Statistics</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${stat.color} mb-2`}>
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Verification Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${stats.total > 0 ? (stats.verified / stats.total) * 100 : 0}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-2">
          <span>Verified: {stats.verified}</span>
          <span>Total: {stats.total}</span>
        </div>
      </div>

      <button 
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        onClick={handleRefresh}
        disabled={isRefreshing}
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  )
}