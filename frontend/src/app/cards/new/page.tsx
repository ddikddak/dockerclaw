import { MainLayout } from '@/components/layout/MainLayout'

export default function NewCardPage() {
  return (
    <MainLayout>
      <div className="h-full flex flex-col items-center justify-center bg-[#f5f5f5] p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Card</h1>
          <p className="text-gray-500">Coming soon...</p>
        </div>
      </div>
    </MainLayout>
  )
}
