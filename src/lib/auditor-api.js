import api from "./api"

export const getAllCompanies = async () => {
    const response = await api.get("/api/v1/company-profile/all")
    return response.data
}

export const getCompanyProfile = async (companyId) => {
    const response = await api.get(`/api/v1/company-profile/${companyId}`)
    return response.data
}

export const getCompanyDocuments = async (companyId) => {
    const response = await api.get(`/api/v1/company-profile/${companyId}/documents`)
    return response.data
}

export const reviewDocument = async (documentId, rating, comment) => {
    const response = await api.post(`/api/v1/audit-review/document/${documentId}`, null, {
        params: { rating, comment }
    })
    return response.data
}

export const getDocumentReview = async (documentId) => {
    const response = await api.get(`/api/v1/audit-review/document/${documentId}`)
    return response.data
}

export const updateReview = async (reviewId, rating, comment) => {
    const response = await api.put(`/api/v1/audit-review/${reviewId}`, {
        rating,
        comments: comment
    })
    return response.data
}

export const getAuditorReviews = async (auditorId) => {
    const response = await api.get(`/api/v1/audit-review/auditor/${auditorId}`)
    return response.data
}

export const downloadFile = async (documentId) => {
    const response = await api.get(`/api/v1/document/download/${documentId}`, {
        responseType: "blob",
    })
    return response.data
}

export const getDocumentMetadata = async (documentId) => {
    const response = await api.get(`/api/v1/document/metadata/${documentId}`)
    return response.data
}

export const hasAlreadyReviewed = async (documentId, auditorId) => {
    try {
        // Get all reviews by this auditor
        const reviews = await getAuditorReviews(auditorId)
        // Check if any of the reviews are for this document
        return reviews.some(review => review.document?.id === documentId)
    } catch {
        return false
    }
}
