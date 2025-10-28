import api from "./api"

// Company owners need to know their company ID to use the APIs
// Since there's no backend endpoint for company owners to get their company profile,
// we'll need to store the company ID when the user logs in or create their profile

export const getMyCompanyProfile = async () => {
    // Company owners can't use /api/v1/company-profile/all (AUDITOR only)
    // Company owners can't use /api/v1/company-profile/{id} (AUDITOR only)
    // This is a backend limitation - company owners have no way to get their company profile
    throw new Error("Company owners cannot get their company profile - backend limitation")
}

export const getMyDocuments = async (companyId) => {
    // Company owners must provide their company ID
    if (!companyId) {
        throw new Error("Company ID is required for company owners")
    }
    const response = await api.get(`/api/v1/company-profile/${companyId}/documents`)
    return response.data
}

export const uploadFile = async (file, companyId, documentType) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("companyId", companyId)
    formData.append("documentType", documentType)

    const response = await api.post("/api/v1/document/upload", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    })
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

export const updateDocument = async (documentId, data) => {
    const response = await api.put(`/api/v1/document/${documentId}`, data)
    return response.data
}

export const deleteDocument = async (documentId) => {
    const response = await api.delete(`/api/v1/document/${documentId}`)
    return response.data
}

export const getCompanyReviews = async (companyId) => {
    const response = await api.get(`/api/v1/audit-review/documents/${companyId}`)
    return response.data
}

export const getDocumentReviews = async (documentId) => {
    try {
        const response = await api.get(`/api/v1/audit-review/document/${documentId}`)
        // Backend now returns a list of reviews, not a single review
        return response.data || []
    } catch (error) {
        // If no reviews, return empty array
        if (error.response?.status === 500 || error.response?.status === 404) {
            return []
        }
        throw error
    }
}

// Helper function to get current user's company by trying to get all companies
// This is a workaround since company owners can't directly get their own company
export const getCurrentUserCompany = async () => {
    const userId = localStorage.getItem("userId")

    if (!userId) {
        throw new Error("User ID not found")
    }

    try {
        // Try to fetch all companies (this endpoint is AUDITOR only, but we'll try)
        const response = await api.get("/api/v1/company-profile/all")
        const allCompanies = response.data

        // Find the company that belongs to the current user
        const userCompany = allCompanies.find(company => company.user?.id === parseInt(userId))

        if (userCompany) {
            return userCompany
        }

        throw new Error("Company not found for current user")
    } catch (error) {
        if (error.response?.status === 403 || error.response?.status === 401) {
            // Permission denied - user doesn't have access to /all endpoint
            // This means we can't check if they have a company
            throw new Error("Cannot check company status - permission denied")
        }
        throw error
    }
}

export const createCompanyProfile = async (data) => {
    const response = await api.post("/api/v1/company-profile", data)
    return response.data
}

export const updateCompany = async (id, data) => {
    const response = await api.put(`/api/v1/company-profile/${id}`, data)
    return response.data
}

export const deleteCompany = async (id) => {
    const response = await api.delete(`/api/v1/company-profile/${id}`)
    return response.data
}

// Auditor functions (these work because auditors can use /api/v1/company-profile/all)
export const getAllCompanies = async () => {
    const response = await api.get("/api/v1/company-profile/all")
    return response.data
}

export const getCompanyProfile = async (id) => {
    const response = await api.get(`/api/v1/company-profile/${id}`)
    return response.data
}

export const getCompanyDocuments = async (companyId) => {
    const response = await api.get(`/api/v1/company-profile/${companyId}/documents`)
    return response.data
}
