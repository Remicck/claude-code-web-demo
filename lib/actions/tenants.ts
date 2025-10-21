"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { tenants, tenantMembers, users } from "@/lib/db/schema"
import { generateId } from "@/lib/uuid"
import { eq, and } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function createTenant(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string | null

  if (!name || name.trim().length === 0) {
    throw new Error("Tenant name is required")
  }

  // Get current user from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  })

  if (!user) {
    throw new Error("User not found")
  }

  const now = new Date()
  const tenantId = generateId()

  try {
    // Create tenant
    await db.insert(tenants).values({
      id: tenantId,
      name: name.trim(),
      description: description?.trim() || null,
      createdById: user.id,
      createdAt: now,
      updatedAt: now,
    })

    // Add creator as owner
    await db.insert(tenantMembers).values({
      id: generateId(),
      tenantId: tenantId,
      userId: user.id,
      displayName: user.displayName,
      role: "owner",
      joinedAt: now,
    })

    revalidatePath("/dashboard/tenants")

    return { success: true, tenantId }
  } catch (error) {
    console.error("Failed to create tenant:", error)
    throw new Error("Failed to create tenant")
  }
}

export async function getTenants() {
  const session = await auth()

  if (!session?.user?.id) {
    return []
  }

  try {
    const userTenants = await db.query.tenantMembers.findMany({
      where: eq(tenantMembers.userId, session.user.id),
      with: {
        tenant: {
          with: {
            createdBy: true,
          },
        },
      },
    })

    return userTenants.map((tm) => ({
      ...tm.tenant,
      memberRole: tm.role,
      memberDisplayName: tm.displayName,
    }))
  } catch (error) {
    console.error("Failed to get tenants:", error)
    return []
  }
}

export async function getTenantById(tenantId: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    // Check if user is a member of this tenant
    const membership = await db.query.tenantMembers.findFirst({
      where: and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, session.user.id)
      ),
    })

    if (!membership) {
      throw new Error("Access denied")
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      with: {
        createdBy: true,
        members: {
          with: {
            user: true,
          },
        },
      },
    })

    return tenant
  } catch (error) {
    console.error("Failed to get tenant:", error)
    throw error
  }
}

export async function addTenantMember(
  tenantId: string,
  formData: FormData
) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const displayName = formData.get("displayName") as string

  if (!displayName || displayName.trim().length === 0) {
    throw new Error("Display name is required")
  }

  try {
    // Check if user is an owner or admin of this tenant
    const membership = await db.query.tenantMembers.findFirst({
      where: and(
        eq(tenantMembers.tenantId, tenantId),
        eq(tenantMembers.userId, session.user.id)
      ),
    })

    if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
      throw new Error("Access denied")
    }

    // Add the current user as a new member with the specified display name
    await db.insert(tenantMembers).values({
      id: generateId(),
      tenantId: tenantId,
      userId: session.user.id,
      displayName: displayName.trim(),
      role: "member",
      joinedAt: new Date(),
    })

    revalidatePath(`/dashboard/tenants/${tenantId}`)

    return { success: true }
  } catch (error) {
    console.error("Failed to add tenant member:", error)
    throw new Error("Failed to add tenant member")
  }
}
