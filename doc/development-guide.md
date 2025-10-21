# 開発ガイドライン

このドキュメントは、プロジェクトのコーディング規約とベストプラクティスをまとめたものです。

## コーディング規約

### TypeScript

#### 型定義

```typescript
// ✅ 推奨: 明示的な型定義
function calculateTotal(amount: number, tax: number): number {
  return amount * (1 + tax)
}

// ❌ 非推奨: any型の使用
function calculateTotal(amount: any, tax: any): any {
  return amount * (1 + tax)
}

// ✅ 推奨: Drizzle ORMからの型推論
import { tenants } from "@/lib/db/schema"
type Tenant = typeof tenants.$inferSelect
type NewTenant = typeof tenants.$inferInsert

// ✅ 推奨: インターフェースの使用
interface TenantWithMembers extends Tenant {
  members: TenantMember[]
}
```

#### Null/Undefined処理

```typescript
// ✅ 推奨: Optional Chaining
const userName = session?.user?.name

// ✅ 推奨: Nullish Coalescing
const displayName = user.name ?? "ゲスト"

// ❌ 非推奨: 非null アサーション（確実な場合のみ）
const name = user!.name
```

#### 非同期処理

```typescript
// ✅ 推奨: async/await
async function getTenant(id: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, id)
  })
  return tenant
}

// ❌ 非推奨: Promise chain（複雑な場合）
function getTenant(id: string) {
  return db.query.tenants.findFirst({
    where: eq(tenants.id, id)
  }).then(tenant => {
    return tenant
  })
}

// ✅ 推奨: エラーハンドリング
async function createTenant(data: NewTenant) {
  try {
    const result = await db.insert(tenants).values(data)
    return { success: true, result }
  } catch (error) {
    console.error("Failed to create tenant:", error)
    throw new Error("テナントの作成に失敗しました")
  }
}
```

### React/Next.js

#### コンポーネント設計

```typescript
// ✅ 推奨: Server Component（デフォルト）
// app/dashboard/tenants/page.tsx
import { getTenants } from "@/lib/actions/tenants"

export default async function TenantsPage() {
  const tenants = await getTenants()

  return (
    <div>
      {tenants.map(tenant => (
        <TenantCard key={tenant.id} tenant={tenant} />
      ))}
    </div>
  )
}

// ✅ 推奨: Client Component（必要な場合のみ）
// components/tenants/create-tenant-dialog.tsx
"use client"

import { useState } from "react"

export function CreateTenantDialog() {
  const [open, setOpen] = useState(false)

  return <Dialog open={open}>...</Dialog>
}

// ❌ 非推奨: 不要なClient Component化
"use client"  // これは不要

export default function StaticList({ items }) {
  return <ul>{items.map(...)}</ul>
}
```

#### Props定義

```typescript
// ✅ 推奨: インターフェースで定義
interface TenantCardProps {
  tenant: Tenant
  showMembers?: boolean
  onSelect?: (id: string) => void
}

export function TenantCard({
  tenant,
  showMembers = false,
  onSelect
}: TenantCardProps) {
  // ...
}

// ✅ 推奨: children の型
interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return <div>{children}</div>
}
```

#### Hooks使用規約

```typescript
// ✅ 推奨: カスタムHooksの命名（use〜）
function useTenantData(tenantId: string) {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchTenantData(tenantId).then(setData)
  }, [tenantId])

  return data
}

// ✅ 推奨: 依存配列の明示
useEffect(() => {
  fetchData()
}, [tenantId, userId]) // 依存する値を全て列挙

// ❌ 非推奨: 依存配列の省略
useEffect(() => {
  fetchData() // tenantIdに依存しているのに列挙していない
}, [])
```

### Server Actions

#### 命名規則

```typescript
// ✅ 推奨: 動詞 + 名詞
export async function createTenant(...)
export async function getTenants(...)
export async function updateTenant(...)
export async function deleteTenant(...)

// ❌ 非推奨: 曖昧な命名
export async function tenant(...)
export async function handleTenant(...)
```

#### 構造

```typescript
// ✅ 推奨: 標準的なServer Action構造
"use server"

export async function createTenant(formData: FormData) {
  // 1. 認証チェック
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // 2. 入力検証
  const name = formData.get("name") as string
  if (!name || name.trim().length === 0) {
    throw new Error("Name is required")
  }

  // 3. データ取得（必要な場合）
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id)
  })
  if (!user) {
    throw new Error("User not found")
  }

  // 4. ビジネスロジック実行
  const tenantId = generateId()
  const now = new Date()

  try {
    // トランザクションを使用
    await db.transaction(async (tx) => {
      await tx.insert(tenants).values({
        id: tenantId,
        name: name.trim(),
        createdById: user.id,
        createdAt: now,
        updatedAt: now,
      })

      await tx.insert(tenantMembers).values({
        id: generateId(),
        tenantId: tenantId,
        userId: user.id,
        displayName: user.displayName,
        role: "owner",
        joinedAt: now,
      })
    })

    // 5. キャッシュ無効化
    revalidatePath("/dashboard/tenants")

    // 6. 結果を返す
    return { success: true, tenantId }
  } catch (error) {
    console.error("Failed to create tenant:", error)
    throw new Error("Failed to create tenant")
  }
}
```

### データベース操作

#### クエリパターン

```typescript
// ✅ 推奨: リレーションの事前読み込み
const tenant = await db.query.tenants.findFirst({
  where: eq(tenants.id, id),
  with: {
    members: {
      with: {
        user: true
      }
    }
  }
})

// ❌ 非推奨: N+1クエリ
const tenant = await db.query.tenants.findFirst({
  where: eq(tenants.id, id)
})
// 各メンバーごとにクエリ実行（N+1問題）
for (const member of tenant.members) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, member.userId)
  })
}
```

#### トランザクション

```typescript
// ✅ 推奨: 複数操作はトランザクションで
await db.transaction(async (tx) => {
  const payment = await tx.insert(payments).values(...)

  for (const split of splits) {
    await tx.insert(paymentSplits).values({
      paymentId: payment.id,
      ...split
    })
  }
})

// ❌ 非推奨: トランザクションなしの複数操作
const payment = await db.insert(payments).values(...)
for (const split of splits) {
  await db.insert(paymentSplits).values(...)
  // 途中で失敗すると不整合が発生
}
```

#### UUIDv7使用

```typescript
// ✅ 推奨: generateId()を使用
import { generateId } from "@/lib/uuid"

const id = generateId() // UUIDv7

// ❌ 非推奨: 他のID生成方法
const id = crypto.randomUUID() // UUIDv4（時系列順序なし）
const id = nanoid() // 別のID生成
```

## ファイル・ディレクトリ命名規則

### ファイル命名

```
# Pages / Routes
kebab-case.tsx        ✅ create-tenant.tsx
kebab-case/page.tsx   ✅ [id]/page.tsx

# Components
PascalCase.tsx        ✅ CreateTenantDialog.tsx
kebab-case.tsx        ✅ create-tenant-dialog.tsx（どちらでも可）

# Utilities / Actions
kebab-case.ts         ✅ tenants.ts, payment-utils.ts

# Types
kebab-case.ts         ✅ tenant-types.ts
types.ts              ✅ types.ts
```

### ディレクトリ構成

```
# 機能別に整理
components/
  ├── ui/              # 汎用UIコンポーネント
  ├── tenants/         # テナント関連
  ├── payments/        # 支払い関連
  └── settings/        # 設定関連

lib/
  ├── actions/         # Server Actions
  ├── db/              # データベース
  └── utils/           # ユーティリティ（将来的に分割）
```

## スタイリング規約

### Tailwind CSS

```typescript
// ✅ 推奨: cn()で条件付きクラス
import { cn } from "@/lib/utils"

<div className={cn(
  "rounded-lg border p-4",
  isActive && "bg-accent",
  size === "lg" && "p-6"
)}>

// ❌ 非推奨: 文字列連結
<div className={`rounded-lg border p-4 ${isActive ? 'bg-accent' : ''}`}>
```

### レスポンシブデザイン

```typescript
// ✅ 推奨: モバイルファースト
<div className="
  grid gap-4           // モバイル: 1カラム
  md:grid-cols-2       // タブレット: 2カラム
  lg:grid-cols-3       // デスクトップ: 3カラム
">

// ✅ 推奨: ブレークポイント
sm:  640px
md:  768px
lg:  1024px
xl:  1280px
2xl: 1536px
```

## エラーハンドリング

### Server Actions

```typescript
// ✅ 推奨: ユーザーフレンドリーなエラーメッセージ
try {
  await db.insert(tenants).values(data)
} catch (error) {
  console.error("Database error:", error)
  throw new Error("グループの作成に失敗しました")
}

// ❌ 非推奨: 技術的なエラーをそのまま投げる
try {
  await db.insert(tenants).values(data)
} catch (error) {
  throw error // "SQLITE_CONSTRAINT..."みたいなエラー
}
```

### Client Components

```typescript
// ✅ 推奨: loading状態とエラー表示
"use client"

export function CreateTenantDialog() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    try {
      await createTenant(formData)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit}>
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      <Button disabled={loading}>
        {loading ? "作成中..." : "作成"}
      </Button>
    </form>
  )
}
```

## テスト方針（今後実装）

### 単体テスト

```typescript
// Server Actions
describe("createTenant", () => {
  it("should create tenant and add creator as owner", async () => {
    // ...
  })

  it("should throw error if not authenticated", async () => {
    // ...
  })
})
```

### 統合テスト

```typescript
// E2E テスト（Playwright等）
test("create and view tenant", async ({ page }) => {
  await page.goto("/dashboard/tenants")
  await page.click("text=新しいグループ")
  await page.fill("input[name=name]", "テストグループ")
  await page.click("text=作成")
  await expect(page.locator("text=テストグループ")).toBeVisible()
})
```

## パフォーマンス

### 画像最適化

```typescript
// ✅ 推奨: next/image使用
import Image from "next/image"

<Image
  src={user.pictureUrl}
  alt={user.name}
  width={40}
  height={40}
  className="rounded-full"
/>

// ❌ 非推奨: img タグ直接使用
<img src={user.pictureUrl} alt={user.name} />
```

### データ取得最適化

```typescript
// ✅ 推奨: 並列データ取得
const [tenants, payments] = await Promise.all([
  getTenants(),
  getRecentPayments()
])

// ❌ 非推奨: 直列データ取得
const tenants = await getTenants()
const payments = await getRecentPayments()
```

## セキュリティ

### XSS対策

```typescript
// ✅ 推奨: Reactは自動的にエスケープ
<div>{user.name}</div>

// ❌ 危険: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### 認証チェック

```typescript
// ✅ 推奨: 全てのServer Actionで認証確認
export async function updateTenant(id: string, data: any) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // さらにテナントメンバーシップ確認
  const membership = await checkMembership(id, session.user.id)
  if (!membership) {
    throw new Error("Access denied")
  }

  // ...
}
```

### 入力検証

```typescript
// ✅ 推奨: サーバー側で必ず検証
export async function createTenant(formData: FormData) {
  const name = formData.get("name") as string

  // 必須チェック
  if (!name || name.trim().length === 0) {
    throw new Error("Name is required")
  }

  // 長さチェック
  if (name.length > 100) {
    throw new Error("Name is too long")
  }

  // 禁止文字チェック（必要に応じて）
  if (/<script>/i.test(name)) {
    throw new Error("Invalid characters")
  }

  // ...
}

// ✅ 推奨: Zodなどのバリデーションライブラリ使用も検討
import { z } from "zod"

const tenantSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional()
})

const data = tenantSchema.parse({
  name: formData.get("name"),
  description: formData.get("description")
})
```

## ドキュメント

### コメント規約

```typescript
// ✅ 推奨: 複雑なロジックには説明を追加
/**
 * 支払いを分配し、各メンバーの負担額を計算します。
 *
 * @param totalAmount - 合計金額
 * @param memberIds - 分配対象のメンバーID配列
 * @param customSplits - カスタム分配（オプション）
 * @returns 各メンバーの負担額
 */
function splitPayment(
  totalAmount: number,
  memberIds: string[],
  customSplits?: Record<string, number>
): Record<string, number> {
  // 均等分割の場合
  if (!customSplits) {
    const perPerson = totalAmount / memberIds.length
    return memberIds.reduce((acc, id) => ({
      ...acc,
      [id]: perPerson
    }), {})
  }

  // カスタム分割の場合
  return customSplits
}

// ❌ 非推奨: 自明なコードへの無駄なコメント
// ユーザー名を取得
const name = user.name
```

### TODO/FIXME

```typescript
// TODO: エラーハンドリングを改善
// FIXME: N+1クエリを解決
// HACK: 一時的な回避策、後で修正
// NOTE: 重要な注意事項
```

## Git運用

### ブランチ戦略

```bash
main                    # 本番環境
├── develop            # 開発統合
└── feature/xxx        # 機能開発
    └── feature/payments  # 支払い機能
```

### コミットメッセージ

```bash
# ✅ 推奨
テナント管理機能の実装

- グループ作成機能追加
- グループ一覧表示
- メンバー管理機能

# ❌ 非推奨
update
fix bug
テナント
```

## まとめ

このガイドラインは以下を重視しています：

1. **型安全性** - TypeScriptの機能を最大限活用
2. **可読性** - 明確な命名、適切なコメント
3. **保守性** - 一貫したパターン、分離された責務
4. **セキュリティ** - 認証・認可、入力検証
5. **パフォーマンス** - 効率的なデータ取得、最適化

---

**このドキュメントは継続的に更新してください。**

**最終更新: 2025-10-21**
