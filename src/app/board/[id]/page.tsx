'use client'

import { useParams } from 'next/navigation'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas'
import Toolbar from '@/components/toolbar/Toolbar'

export default function BoardPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100">
      <Toolbar boardId={id} />
      <div className="flex-1 relative">
        <WhiteboardCanvas boardId={id} />
      </div>
    </div>
  )
}
