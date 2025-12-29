'use client'

import { useParams } from 'next/navigation'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas'
import Toolbar from '@/components/toolbar/Toolbar'
import { WhiteboardProvider } from '@/contexts/WhiteboardContext'

export default function BoardPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  return (
    <WhiteboardProvider boardId={id}>
      <div className="h-screen w-screen flex flex-col bg-gray-100">
        <Toolbar boardId={id} />
        <div className="flex-1 relative">
          <WhiteboardCanvas boardId={id} />
        </div>
      </div>
    </WhiteboardProvider>
  )
}
