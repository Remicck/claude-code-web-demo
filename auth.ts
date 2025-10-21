import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import type { Provider } from "next-auth/providers"
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
  providers: [LineProvider],
  callbacks: {
    async signIn({ user, account, profile }) {
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
              displayName: user.name || profile.displayName || "Unknown",
              pictureUrl: user.image || profile.pictureUrl || null,
              email: user.email || profile.email || null,
              updatedAt: now,
            })
            .where(eq(users.id, existingUser.id))
        } else {
          // Create new user
          await db.insert(users).values({
            id: generateId(),
            lineId,
            displayName: user.name || profile.displayName || "Unknown",
            pictureUrl: user.image || profile.pictureUrl || null,
            email: user.email || profile.email || null,
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
        // Get user from database using LINE ID
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
