import { MainLayout } from '@/components/layout/MainLayout'

export default function ApiDocsPage() {
  return (
    <MainLayout>
      <div className="h-full flex flex-col items-center justify-center bg-[#f5f5f5] p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">API Documentation</h1>
          <p className="text-gray-500">Coming soon...</p>
        </div>
      </div>
    </MainLayout>
  )
}
