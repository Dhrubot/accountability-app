// components/CasesList.js
import { useState, useEffect } from 'react'

export default function CasesList() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchCases()
  }, [search, statusFilter, page])

  const fetchCases = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/cases?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setCases(data.cases || [])
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      missing: 'bg-yellow-100 text-yellow-800',
      injured: 'bg-orange-100 text-orange-800',
      deceased: 'bg-red-100 text-red-800',
      safe: 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Cases Directory</h2>
      
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="missing">Missing</option>
          <option value="injured">Injured</option>
          <option value="deceased">Deceased</option>
          <option value="safe">Safe</option>
        </select>
      </div>

      {/* Cases Grid */}
      {loading ? (
        <div className="text-center py-8">Loading cases...</div>
      ) : (
        <div className="grid gap-4">
          {cases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No cases found.</div>
          ) : (
            cases.map((case_) => (
              <div key={case_.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{case_.name}</h3>
                    {case_.age && (
                      <p className="text-sm text-gray-600">
                        Age: {case_.age} {case_.grade && `| Grade: ${case_.grade}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(case_.status)}`}>
                      {case_.status.toUpperCase()}
                    </span>
                    {case_.verification_status === 'verified' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        VERIFIED
                      </span>
                    )}
                  </div>
                </div>
                
                {case_.last_seen_location && (
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Last seen:</strong> {case_.last_seen_location}
                    {case_.last_seen_time && ` on ${new Date(case_.last_seen_time).toLocaleString()}`}
                  </p>
                )}
                
                {case_.hospital_facility && (
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Hospital/Facility:</strong> {case_.hospital_facility}
                  </p>
                )}
                
                {case_.description && (
                  <p className="text-sm text-gray-700 mt-3">{case_.description}</p>
                )}
                
                <div className="text-xs text-gray-500 mt-3">
                  Submitted: {new Date(case_.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center mt-6 gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-gray-700">Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={cases.length < 20}
          className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}