'use client'

import { usePagesStore } from '@/stores/pages-store'
import { useWhiteboardContext } from '@/contexts/WhiteboardContext'

interface PageNavigatorProps {
  canEdit: boolean
}

export default function PageNavigator({ canEdit }: PageNavigatorProps) {
  const { pages, currentPageIndex, deletePage, setCurrentPage } = usePagesStore()
  const { saveCurrentPage, loadPage, addNewPage } = useWhiteboardContext()

  const handlePageChange = (index: number) => {
    if (index === currentPageIndex) return

    // Save current page before switching
    saveCurrentPage()

    // Update the store
    setCurrentPage(index)

    // Load the new page
    loadPage(index)
  }

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-xl shadow-lg border border-gray-200 p-2 flex flex-col gap-2 max-h-[70vh] overflow-y-auto z-10">
      {/* Page list */}
      <div className="flex flex-col gap-2">
        {pages.map((page, index) => (
          <div
            key={page.id}
            className={`relative group cursor-pointer transition-all ${
              currentPageIndex === index
                ? 'ring-2 ring-blue-500'
                : 'hover:ring-2 hover:ring-gray-300'
            }`}
            onClick={() => handlePageChange(index)}
          >
            {/* Thumbnail or placeholder */}
            <div
              className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center"
              style={{
                backgroundImage: page.thumbnail ? `url(${page.thumbnail})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!page.thumbnail && (
                <span className="text-xs text-gray-400">{index + 1}</span>
              )}
            </div>

            {/* Page number badge */}
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-gray-700 text-white text-xs rounded-full flex items-center justify-center">
              {index + 1}
            </div>

            {/* Delete button (only show if can edit and more than 1 page) */}
            {canEdit && pages.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete ${page.name}?`)) {
                    // Save current page first if we're not deleting it
                    if (index !== currentPageIndex) {
                      saveCurrentPage()
                    }

                    // Calculate what the new current page will be after deletion
                    let newCurrentIndex = currentPageIndex
                    if (index < currentPageIndex) {
                      newCurrentIndex = currentPageIndex - 1
                    } else if (index === currentPageIndex) {
                      newCurrentIndex = Math.min(index, pages.length - 2)
                    }

                    // Delete the page
                    deletePage(index)

                    // Load the new current page
                    loadPage(newCurrentIndex)
                  }
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Delete page"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add page button */}
      {canEdit && (
        <button
          onClick={addNewPage}
          className="w-16 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400 transition-colors"
          title="Add new page"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Page count */}
      <div className="text-center text-xs text-gray-500 mt-1">
        {currentPageIndex + 1} / {pages.length}
      </div>
    </div>
  )
}
