'use client'

import { useParams } from 'next/navigation'
import WhiteboardCanvas from '@/components/canvas/WhiteboardCanvas'
import Toolbar from '@/components/toolbar/Toolbar'
import PageNavigator from '@/components/pages/PageNavigator'
import { WhiteboardProvider } from '@/contexts/WhiteboardContext'
import { useWhiteboardContext } from '@/contexts/WhiteboardContext'

function BoardContent({ boardId }: { boardId: string }) {
  const { canEdit } = useWhiteboardContext()

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100">
      <Toolbar boardId={boardId} />
      <div className="flex-1 relative">
        <WhiteboardCanvas boardId={boardId} />
        <PageNavigator canEdit={canEdit} />
      </div>
    </div>
  )
}

export default function BoardPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  return (
    <WhiteboardProvider boardId={id}>
      <BoardContent boardId={id} />
    </WhiteboardProvider>
  )
}
