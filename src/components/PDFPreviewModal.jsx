import { X } from "lucide-react"

export default function PDFPreviewModal({ document, isOpen, onClose }) {
  if (!isOpen || !document) return null

  const isPDF = document.fileType === "application/pdf" || document.fileName?.toLowerCase().endsWith(".pdf")

  // Convert base64 to blob URL
  const getPDFUrl = () => {
    if (!document.fileData) return null
    try {
      const byteCharacters = atob(document.fileData)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "application/pdf" })
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error("Error converting PDF:", error)
      return null
    }
  }

  const pdfUrl = isPDF ? getPDFUrl() : null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full h-[95vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h3 className="text-lg font-bold text-gray-900">{document.fileName}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title={document.fileName}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Unable to preview this PDF</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

