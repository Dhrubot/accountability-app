// pages/index.js
import { useState, useEffect } from 'react'
import Head from 'next/head'
import SubmissionForm from '../components/SubmissionForm'
import CasesList from '../components/CasesList'
import StatsDashboard from '../components/StatsDashboard'
import { 
  UserGroupIcon, 
  PlusIcon, 
  ChartBarIcon,
  HeartIcon,
  ShieldCheckIcon,
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

export default function Home() {
  const [activeTab, setActiveTab] = useState('cases')
  const [publicData, setPublicData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCaseForUpdate, setSelectedCaseForUpdate] = useState(null)

  // Fetch combined public data once when component mounts
  useEffect(() => {
    fetchPublicData()
  }, [])

  const fetchPublicData = async (params = {}) => {
    try {
      setIsLoading(true)
      const searchParams = new URLSearchParams({
        page: '1',
        limit: '20',
        ...params
      })
      
      const response = await fetch(`/api/public-data?${searchParams}`)
      const data = await response.json()
      
      if (response.ok) {
        setPublicData(data)
        
        // Show cache status for debugging
        if (data.cached) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`📦 Public data served from cache (${data.cacheAge}s old)`)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch public data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const tabs = [
    { 
      id: 'cases', 
      label: 'Cases Directory', 
      icon: UserGroupIcon,
      description: 'View all reported cases',
      color: 'blue'
    },
    { 
      id: 'submit', 
      label: 'Submit Case', 
      icon: PlusIcon,
      description: 'Report a new case',
      color: 'green'
    },
    { 
      id: 'update', 
      label: 'Update Case', 
      icon: PencilSquareIcon,
      description: 'Update an existing case',
      color: 'orange'
    },
    { 
      id: 'stats', 
      label: 'Live Statistics', 
      icon: ChartBarIcon,
      description: 'Real-time data',
      color: 'purple'
    }
  ]

  const getTabColor = (color, active) => {
    const colors = {
      blue: active 
        ? 'border-blue-500 text-blue-600 bg-blue-50' 
        : 'border-transparent text-gray-500 hover:text-blue-600 hover:border-blue-300',
      green: active 
        ? 'border-green-500 text-green-600 bg-green-50' 
        : 'border-transparent text-gray-500 hover:text-green-600 hover:border-green-300',
      orange: active 
        ? 'border-orange-500 text-orange-600 bg-orange-50' 
        : 'border-transparent text-gray-500 hover:text-orange-600 hover:border-orange-300',
      purple: active 
        ? 'border-purple-500 text-purple-600 bg-purple-50' 
        : 'border-transparent text-gray-500 hover:text-purple-600 hover:border-purple-300'
    }
    return colors[color] || colors.blue
  }

  const handleCaseSelect = (caseData) => {
    setSelectedCaseForUpdate(caseData)
    setActiveTab('submit') // Switch to submission form with pre-populated data
  }

  const handleCancelUpdate = () => {
    setSelectedCaseForUpdate(null)
    setActiveTab('cases')
  }

  return (
    <>
      <Head>
        <title>Onushondhan - Milestone Crash Registry</title>
        <meta name="description" content="Memorial and accountability platform for victims of the July 21, 2025 Dhaka plane crash" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4 sm:py-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl sm:text-2xl text-white">🏫</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Onushondhan
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:block">
                    Memorial Registry - July 21, 2025 Milestone School Tragedy
                  </p>
                  <p className="text-xs text-gray-600 font-medium sm:hidden">
                    Memorial Registry
                  </p>
                </div>
              </div>
              <div className="hidden lg:flex items-center space-x-6 text-sm">
                <div className="flex items-center text-gray-600">
                  <ShieldCheckIcon className="w-4 h-4 mr-2 text-green-500" />
                  <span>Secure & Verified</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="w-4 h-4 mr-2 text-blue-500" />
                  <span>Real-time Updates</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <HeartIcon className="w-4 h-4 mr-2 text-red-500" />
                  <span>Community Driven</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Ensuring Accountability and Remembrance
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              A transparent platform to document, verify, and honor those affected by the tragedy
            </p>
            <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-2xl font-bold">Community</div>
                <div className="text-blue-200">Driven</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-2xl font-bold">Verified</div>
                <div className="text-blue-200">Information</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-2xl font-bold">Transparent</div>
                <div className="text-blue-200">Process</div>
              </div>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <nav className="bg-white/90 backdrop-blur-md shadow-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center">
              <div className="flex flex-col sm:flex-row sm:space-x-1 space-y-2 sm:space-y-0 p-2 sm:p-1 bg-gray-100 rounded-xl my-4 w-full sm:w-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative px-4 sm:px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 flex items-center space-x-2 sm:min-w-[160px] justify-center w-full sm:w-auto ${
                        isActive
                          ? 'bg-white text-gray-800 shadow-md transform scale-105'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : ''}`} />
                      <div className="text-center">
                        <div className="font-semibold">{tab.label}</div>
                        <div className="text-xs text-gray-500 hidden sm:block">{tab.description}</div>
                      </div>
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full -mb-2"></div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="min-h-[600px]">
            {activeTab === 'cases' && (
              <div className="animate-fadeIn">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Cases Directory</h3>
                  <p className="text-gray-600">Browse all verified and pending cases</p>
                </div>
                <CasesList 
                  publicData={publicData} 
                  onSearch={fetchPublicData}
                  isLoading={isLoading}
                  showUpdateButton={true}
                  onCaseSelect={handleCaseSelect}
                />
              </div>
            )}
            {activeTab === 'submit' && (
              <div className="animate-fadeIn">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedCaseForUpdate ? 'Update Case' : 'Submit New Case'}
                  </h3>
                  {selectedCaseForUpdate && (
                    <p className="text-gray-600">Update existing case: {selectedCaseForUpdate.name}</p>
                  )}
                </div>
                <SubmissionForm 
                  initialData={selectedCaseForUpdate}
                  isUpdate={!!selectedCaseForUpdate}
                  onSubmitSuccess={() => {
                    setSelectedCaseForUpdate(null)
                    setActiveTab('cases')
                    fetchPublicData() // Refresh data
                  }}
                />
                {selectedCaseForUpdate && (
                  <button
                    onClick={handleCancelUpdate}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel Update
                  </button>
                )}
              </div>
            )}
            {activeTab === 'update' && (
              <div className="animate-fadeIn">
                <div className="text-center py-12">
                  <PencilSquareIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Update Existing Case</h2>
                  <p className="text-gray-600 mb-6">
                    Select a case from the "View Cases" tab to update its information
                  </p>
                  <button
                    onClick={() => setActiveTab('cases')}
                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Browse Cases
                  </button>
                </div>
              </div>
            )}
            {activeTab === 'stats' && (
              <div className="animate-fadeIn">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Live Statistics</h3>
                  <p className="text-gray-600">Real-time data and insights</p>
                </div>
                <StatsDashboard 
                  statsData={publicData?.stats}
                  onRefresh={() => fetchPublicData({ fresh: 'true' })}
                  isLoading={isLoading}
                />
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white">🏫</span>
                  </div>
                  <h3 className="text-xl font-bold">Onushondhan</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  A memorial and accountability platform dedicated to documenting and remembering 
                  those affected by the July 21, 2025 tragedy.
                </p>
                <div className="flex items-center text-gray-400">
                  <HeartIcon className="w-4 h-4 mr-2" />
                  <span>Built with compassion and transparency</span>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Our Mission</h4>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Ensure accurate documentation of all cases
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Provide transparent verification process
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Support families in their search for truth
                  </li>
                  <li className="flex items-center">
                    <span className="mr-2">•</span>
                    Preserve memory and promote accountability
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Data Protection</h4>
                <div className="space-y-3 text-gray-300">
                  <div className="flex items-start">
                    <ShieldCheckIcon className="w-5 h-5 mr-2 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Secure & Encrypted</div>
                      <div className="text-sm text-gray-400">All data is protected and backed up</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <UserGroupIcon className="w-5 h-5 mr-2 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Privacy Respected</div>
                      <div className="text-sm text-gray-400">Contact info protected from public view</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <ClockIcon className="w-5 h-5 mr-2 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Permanent Record</div>
                      <div className="text-sm text-gray-400">Data preserved for historical accountability</div>
                    </div>
                  </div>
                </div>
                
                {/* Support Contact */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <h5 className="text-md font-medium mb-2 text-gray-200">Need Help?</h5>
                  <a 
                    href="mailto:support@onushondhan.org" 
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-200 text-sm flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    support@onushondhan.org
                  </a>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-700 mt-8 pt-8 text-center">
              <p className="text-gray-400">
                This platform is dedicated to truth, transparency, and remembrance. 
                All submissions are verified to ensure accuracy and prevent misinformation.
              </p>
              <p className="text-gray-500 mt-2 text-sm">
                Built with Next.js • Secured with Supabase • Protected by Cloudflare
              </p>
            </div>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}