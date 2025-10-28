import api from "./api"

export const signup = async (data) => {
    try {
        const response = await api.post("/api/v1/auth/signup", {
            username: data.email,
            password: data.password,
            name: data.name,
            role: data.role
        })
        return response.data
    } catch (error) {
        if (error.response?.status === 400) {
            throw new Error("This email is already registered. Please use a different email or try logging in.")
        }
        if (error.response?.data?.error?.includes("duplicate key")) {
            throw new Error("This email is already registered. Please use a different email or try logging in.")
        }
        throw error
    }
}

export const login = async (data) => {
    const response = await api.post("/api/v1/auth/login", {
        username: data.email,
        password: data.password
    })
    if (response.data.token) {
        localStorage.setItem("token", response.data.token)
        localStorage.setItem("userRole", response.data.user.role)
        localStorage.setItem("userId", response.data.user.id)

        // For company owners, try to get their company ID
        // Since there's no direct endpoint, we'll need to get it from localStorage
        // or fetch it when the dashboard loads
    }
    return response.data
}

export const logout = () => {
    // Don't remove companyId - keep it for next login
    localStorage.removeItem("token")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userId")
    window.location.href = "/"
}

export const getCurrentUser = () => {
    const token = localStorage.getItem("token")
    const userRole = localStorage.getItem("userRole")
    const userId = localStorage.getItem("userId")

    if (!token || !userRole || !userId) return null

    return {
        id: userId,
        role: userRole,
        token: token
    }
}

export const isAuthenticated = () => {
    return !!localStorage.getItem("token")
}
