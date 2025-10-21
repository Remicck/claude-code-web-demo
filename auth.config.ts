import type { NextAuthConfig } from "next-auth"

// Handle NEXTAUTH_URL fallback for Vercel environments
const getAuthUrl = () => {
  // Explicit NEXTAUTH_URL takes precedence
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL
  }

  // Vercel URL fallback
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`
  }

  // Local development fallback
  return "http://localhost:3000"
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  basePath: "/api/auth",
  trustHost: true, // Required for Vercel deployments
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")

      if (isOnDashboard) {
        if (isLoggedIn) return true
        return false // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig

export const AUTH_URL = getAuthUrl()
