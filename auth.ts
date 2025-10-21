import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import type { Provider } from "next-auth/providers"
import Credentials from "next-auth/providers/credentials"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { generateId } from "@/lib/uuid"

// LINE Provider configuration
const LineProvider: Provider = {
  id: "line",
  name: "LINE",
  type: "oauth",
  authorization: {
    url: "https://access.line.me/oauth2/v2.1/authorize",
    params: {
      scope: "profile openid email",
      bot_prompt: "normal",
    },
  },
  token: "https://api.line.me/oauth2/v2.1/token",
  userinfo: "https://api.line.me/v2/profile",
  clientId: process.env.LINE_CHANNEL_ID,
  clientSecret: process.env.LINE_CHANNEL_SECRET,
  profile(profile) {
    return {
      id: profile.userId,
      name: profile.displayName,
      email: profile.email || null,
      image: profile.pictureUrl || null,
    }
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    LineProvider,
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Only allow admin/admin for E2E testing
        if (credentials?.username === "admin" && credentials?.password === "admin") {
          // Check if admin user exists
          let adminUser = await db.query.users.findFirst({
            where: eq(users.lineId, "admin-test-user"),
          })

          const now = new Date()

          if (!adminUser) {
            // Create admin test user
            const adminId = generateId()
            await db.insert(users).values({
              id: adminId,
              lineId: "admin-test-user",
              displayName: "Admin (Test)",
              pictureUrl: null,
              email: "admin@test.local",
              createdAt: now,
              updatedAt: now,
            })

            adminUser = await db.query.users.findFirst({
              where: eq(users.lineId, "admin-test-user"),
            })
          }

          if (adminUser) {
            return {
              id: adminUser.lineId, // Use lineId as the token sub
              name: adminUser.displayName,
              email: adminUser.email || undefined,
            }
          }
        }

        return null
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Credentials provider
      if (account?.provider === "credentials") {
        return true
      }

      // Handle LINE provider
      if (!account || !profile) return false

      const lineId = account.providerAccountId

      try {
        // Check if user exists
        const existingUser = await db.query.users.findFirst({
          where: eq(users.lineId, lineId),
        })

        const now = new Date()

        if (existingUser) {
          // Update existing user
          await db
            .update(users)
            .set({
              displayName: user.name || (profile as any)?.displayName || "Unknown",
              pictureUrl: user.image || (profile as any)?.pictureUrl || null,
              email: user.email || (profile as any)?.email || null,
              updatedAt: now,
            })
            .where(eq(users.id, existingUser.id))
        } else {
          // Create new user
          await db.insert(users).values({
            id: generateId(),
            lineId,
            displayName: user.name || (profile as any)?.displayName || "Unknown",
            pictureUrl: user.image || (profile as any)?.pictureUrl || null,
            email: user.email || (profile as any)?.email || null,
            createdAt: now,
            updatedAt: now,
          })
        }

        return true
      } catch (error) {
        console.error("Error in signIn callback:", error)
        return false
      }
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        // Get user from database using LINE ID (or admin-test-user for credentials)
        const user = await db.query.users.findFirst({
          where: eq(users.lineId, token.sub),
        })

        if (user) {
          session.user.id = user.id
        }
      }
      return session
    },
  },
})
