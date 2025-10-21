import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"

// ユーザーテーブル
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  lineId: text("line_id").unique().notNull(),
  displayName: text("display_name").notNull(),
  pictureUrl: text("picture_url"),
  email: text("email"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

// テナント（グループ）テーブル
export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdById: text("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

// テナントメンバーテーブル
export const tenantMembers = sqliteTable("tenant_members", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(), // テナント内での表示名
  role: text("role").notNull().default("member"), // owner, admin, member
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
})

// 支払い方法の種類
export const paymentMethodTypes = [
  "bank_transfer",
  "paypay",
  "line_pay",
  "cash",
  "other",
] as const

// 支払い方法テーブル
export const paymentMethods = sqliteTable("payment_methods", {
  id: text("id").primaryKey(),
  tenantMemberId: text("tenant_member_id")
    .notNull()
    .references(() => tenantMembers.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // bank_transfer, paypay, line_pay, cash, other
  label: text("label").notNull(), // "三菱UFJ銀行", "PayPay"など
  accountInfo: text("account_info"), // 口座番号やPayPay IDなど（JSON文字列）
  priority: integer("priority").notNull().default(0), // 優先順位（低い数字が高優先）
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

// 支払い記録テーブル
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  paidById: text("paid_by_id")
    .notNull()
    .references(() => tenantMembers.id),
  title: text("title").notNull(),
  description: text("description"),
  totalAmount: real("total_amount").notNull(),
  paidAt: integer("paid_at", { mode: "timestamp" }).notNull(), // 実際の支払い日
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

// 支払い分配テーブル
export const paymentSplits = sqliteTable("payment_splits", {
  id: text("id").primaryKey(),
  paymentId: text("payment_id")
    .notNull()
    .references(() => payments.id, { onDelete: "cascade" }),
  tenantMemberId: text("tenant_member_id")
    .notNull()
    .references(() => tenantMembers.id),
  amount: real("amount").notNull(), // この人が負担する金額
  isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
})

// 清算ログテーブル
export const settlementLogs = sqliteTable("settlement_logs", {
  id: text("id").primaryKey(),
  paymentSplitId: text("payment_split_id")
    .notNull()
    .references(() => paymentSplits.id),
  fromMemberId: text("from_member_id")
    .notNull()
    .references(() => tenantMembers.id), // 支払った人
  toMemberId: text("to_member_id")
    .notNull()
    .references(() => tenantMembers.id), // 受け取った人（立て替えた人）
  amount: real("amount").notNull(),
  paymentMethodId: text("payment_method_id").references(
    () => paymentMethods.id
  ),
  note: text("note"),
  settledAt: integer("settled_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
})

// リレーション定義
export const usersRelations = relations(users, ({ many }) => ({
  tenantMemberships: many(tenantMembers),
  createdTenants: many(tenants),
}))

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [tenants.createdById],
    references: [users.id],
  }),
  members: many(tenantMembers),
  payments: many(payments),
}))

export const tenantMembersRelations = relations(
  tenantMembers,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [tenantMembers.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [tenantMembers.userId],
      references: [users.id],
    }),
    paymentMethods: many(paymentMethods),
    paidPayments: many(payments),
    paymentSplits: many(paymentSplits),
  })
)

export const paymentMethodsRelations = relations(paymentMethods, ({ one }) => ({
  tenantMember: one(tenantMembers, {
    fields: [paymentMethods.tenantMemberId],
    references: [tenantMembers.id],
  }),
}))

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  paidBy: one(tenantMembers, {
    fields: [payments.paidById],
    references: [tenantMembers.id],
  }),
  splits: many(paymentSplits),
}))

export const paymentSplitsRelations = relations(
  paymentSplits,
  ({ one, many }) => ({
    payment: one(payments, {
      fields: [paymentSplits.paymentId],
      references: [payments.id],
    }),
    tenantMember: one(tenantMembers, {
      fields: [paymentSplits.tenantMemberId],
      references: [tenantMembers.id],
    }),
    settlementLogs: many(settlementLogs),
  })
)

export const settlementLogsRelations = relations(settlementLogs, ({ one }) => ({
  paymentSplit: one(paymentSplits, {
    fields: [settlementLogs.paymentSplitId],
    references: [paymentSplits.id],
  }),
  fromMember: one(tenantMembers, {
    fields: [settlementLogs.fromMemberId],
    references: [tenantMembers.id],
  }),
  toMember: one(tenantMembers, {
    fields: [settlementLogs.toMemberId],
    references: [tenantMembers.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [settlementLogs.paymentMethodId],
    references: [paymentMethods.id],
  }),
}))
