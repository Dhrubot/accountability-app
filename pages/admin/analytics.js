import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { ChartBarIcon } from '@heroicons/react/24/outline'

export default function AdminAnalytics() {
  return (
    <AdminLayout>
      <Head>
        <title>Analytics - Admin</title>
      </Head>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Detailed analytics and reporting</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics Dashboard</h2>
          <p className="text-gray-600 mb-4">Coming soon - Advanced analytics and reporting features</p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-blue-800 text-sm">
              This section will include detailed submission trends, verification rates, 
              and comprehensive reporting tools.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}