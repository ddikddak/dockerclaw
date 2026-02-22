import { MainLayout } from '@/components/layout/MainLayout'

interface CardDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params

  return (
    <MainLayout>
      <div className="h-full flex flex-col items-center justify-center bg-[#f5f5f5] p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Card Details</h1>
          <p className="text-gray-500 mb-2">Coming soon...</p>
          <p className="text-sm text-gray-400">Card ID: {id}</p>
        </div>
      </div>
    </MainLayout>
  )
}
