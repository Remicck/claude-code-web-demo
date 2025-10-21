# API設計

このドキュメントでは、Server ActionsとAPI Routesの設計を説明します。

## Server Actions概要

Next.js 15のServer Actionsを主要なAPIとして使用します。従来のREST APIと異なり、型安全性が高く、クライアントコードとの統合が容易です。

### Server Actionsの利点

1. **型安全性** - TypeScriptの型がクライアント・サーバー間で共有
2. **シンプル** - APIエンドポイント不要
3. **最適化** - 必要なコードのみバンドル
4. **セキュリティ** - サーバー側でのみ実行

## ファイル構成

```
lib/actions/
├── tenants.ts         # テナント関連
├── payments.ts        # 支払い関連（実装予定）
├── members.ts         # メンバー関連（実装予定）
└── settlement.ts      # 清算関連（実装予定）
```

## テナント関連 Actions

### `createTenant`

新しいテナント（グループ）を作成します。

**場所:** `lib/actions/tenants.ts`

**シグネチャ:**
```typescript
export async function createTenant(
  formData: FormData
): Promise<{ success: true; tenantId: string }>
```

**入力:**
```typescript
{
  name: string          // 必須: グループ名
  description?: string  // 任意: 説明
}
```

**処理フロー:**
1. 認証チェック
2. 入力検証
3. ユーザー情報取得
4. トランザクション開始
   - tenants テーブルへ挿入
   - tenant_members テーブルへ作成者を owner として挿入
5. revalidatePath("/dashboard/tenants")
6. 結果返却

**返却値:**
```typescript
{
  success: true,
  tenantId: string  // 作成されたテナントのID
}
```

**エラー:**
- `Unauthorized` - 未認証
- `Name is required` - 名前が空
- `User not found` - ユーザーが見つからない
- `Failed to create tenant` - DB操作失敗

**使用例:**
```typescript
// Client Component
async function handleSubmit(formData: FormData) {
  try {
    const result = await createTenant(formData)
    router.push(`/dashboard/tenants/${result.tenantId}`)
  } catch (error) {
    alert(error.message)
  }
}
```

---

### `getTenants`

現在のユーザーが参加しているテナント一覧を取得します。

**場所:** `lib/actions/tenants.ts`

**シグネチャ:**
```typescript
export async function getTenants(): Promise<TenantWithRole[]>
```

**入力:** なし（セッションから自動取得）

**処理フロー:**
1. 認証チェック
2. tenant_members から該当ユーザーのメンバーシップ取得
3. 各メンバーシップに対して tenant 情報を結合
4. ロールと表示名を含めて返却

**返却値:**
```typescript
Array<{
  id: string
  name: string
  description: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
  memberRole: string        // "owner" | "admin" | "member"
  memberDisplayName: string // テナント内での表示名
}>
```

**エラー:**
- なし（未認証の場合は空配列を返す）

**使用例:**
```typescript
// Server Component
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
```

---

### `getTenantById`

特定のテナント詳細情報を取得します。

**場所:** `lib/actions/tenants.ts`

**シグネチャ:**
```typescript
export async function getTenantById(
  tenantId: string
): Promise<TenantWithMembersAndCreator>
```

**入力:**
```typescript
{
  tenantId: string  // テナントID
}
```

**処理フロー:**
1. 認証チェック
2. メンバーシップ確認（ユーザーがこのテナントのメンバーか）
3. テナント情報をメンバー・作成者情報と共に取得
4. 返却

**返却値:**
```typescript
{
  id: string
  name: string
  description: string | null
  createdById: string
  createdAt: Date
  updatedAt: Date
  createdBy: User
  members: Array<{
    id: string
    displayName: string
    role: string
    joinedAt: Date
    user: User
  }>
}
```

**エラー:**
- `Unauthorized` - 未認証
- `Access denied` - メンバーではない

**使用例:**
```typescript
// Server Component
export default async function TenantDetailPage({ params }) {
  const tenant = await getTenantById(params.id)

  return (
    <div>
      <h1>{tenant.name}</h1>
      <p>メンバー: {tenant.members.length}人</p>
    </div>
  )
}
```

---

### `addTenantMember`

テナントにメンバーを追加します。

**場所:** `lib/actions/tenants.ts`

**シグネチャ:**
```typescript
export async function addTenantMember(
  tenantId: string,
  formData: FormData
): Promise<{ success: true }>
```

**入力:**
```typescript
{
  tenantId: string      // テナントID
  displayName: string   // テナント内での表示名
}
```

**処理フロー:**
1. 認証チェック
2. 権限チェック（owner または admin のみ）
3. tenant_members へ挿入
4. revalidatePath(`/dashboard/tenants/${tenantId}`)
5. 結果返却

**返却値:**
```typescript
{
  success: true
}
```

**エラー:**
- `Unauthorized` - 未認証
- `Access denied` - owner/admin ではない
- `Display name is required` - 表示名が空
- `Failed to add tenant member` - DB操作失敗

**使用例:**
```typescript
// Client Component
async function handleAddMember(formData: FormData) {
  try {
    await addTenantMember(tenantId, formData)
    setOpen(false)
    router.refresh()
  } catch (error) {
    alert(error.message)
  }
}
```

## 支払い関連 Actions（実装予定）

### `createPayment`

新しい支払い記録を作成します。

**シグネチャ:**
```typescript
export async function createPayment(
  tenantId: string,
  formData: FormData
): Promise<{ success: true; paymentId: string }>
```

**入力:**
```typescript
{
  tenantId: string
  title: string          // 支払いタイトル
  description?: string   // 説明
  totalAmount: number    // 合計金額
  paidAt: Date          // 支払い日時
  splits: Array<{       // 分配情報
    memberId: string
    amount: number
  }>
}
```

**処理フロー:**
1. 認証・権限チェック
2. 入力検証（金額の合計チェック等）
3. トランザクション開始
   - payments テーブルへ挿入
   - payment_splits テーブルへ各分配を挿入
4. revalidatePath
5. 結果返却

---

### `getPayments`

テナントの支払い一覧を取得します。

**シグネチャ:**
```typescript
export async function getPayments(
  tenantId: string,
  options?: {
    limit?: number
    offset?: number
    includeSettled?: boolean
  }
): Promise<PaymentWithSplits[]>
```

---

### `updatePaymentSplit`

支払い分配を清算済みにマークします。

**シグネチャ:**
```typescript
export async function updatePaymentSplit(
  splitId: string,
  isPaid: boolean
): Promise<{ success: true }>
```

---

### `createSettlement`

清算ログを作成します。

**シグネチャ:**
```typescript
export async function createSettlement(
  splitId: string,
  formData: FormData
): Promise<{ success: true; settlementId: string }>
```

**入力:**
```typescript
{
  splitId: string
  paymentMethodId?: string
  note?: string
  settledAt: Date
}
```

## 支払い方法関連 Actions（実装予定）

### `createPaymentMethod`

支払い方法を登録します。

**シグネチャ:**
```typescript
export async function createPaymentMethod(
  tenantMemberId: string,
  formData: FormData
): Promise<{ success: true; methodId: string }>
```

**入力:**
```typescript
{
  type: "bank_transfer" | "paypay" | "line_pay" | "cash" | "other"
  label: string
  accountInfo: object  // 支払い方法に応じた情報
  priority: number
}
```

---

### `getPaymentMethods`

メンバーの支払い方法一覧を取得します。

**シグネチャ:**
```typescript
export async function getPaymentMethods(
  tenantMemberId: string
): Promise<PaymentMethod[]>
```

## 認証関連 API Routes

### POST `/api/auth/[...nextauth]`

NextAuth.jsによる認証エンドポイント。

**主要なエンドポイント:**

#### `GET /api/auth/signin`
ログインページ（自動リダイレクト）

#### `GET /api/auth/callback/line`
LINE Loginからのコールバック

#### `GET /api/auth/session`
現在のセッション情報取得

```typescript
// Response
{
  user: {
    id: string
    name: string
    email: string | null
    image: string | null
  }
  expires: string
}
```

#### `POST /api/auth/signout`
ログアウト

## エラーハンドリング

### エラーレスポンス形式

Server Actionsは例外をスローします：

```typescript
// 標準的なエラー
throw new Error("エラーメッセージ")

// カスタムエラー（将来的に）
class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized")
    this.name = "UnauthorizedError"
  }
}
```

### クライアント側でのハンドリング

```typescript
try {
  await createTenant(formData)
} catch (error) {
  if (error instanceof Error) {
    alert(error.message)
  } else {
    alert("予期しないエラーが発生しました")
  }
}
```

## レート制限（今後実装）

本番環境では以下のレート制限を検討：

```typescript
// 例: 1分間に10リクエストまで
const limit = rateLimit({
  interval: 60 * 1000, // 1分
  uniqueTokenPerInterval: 500,
})

export async function createTenant(formData: FormData) {
  await limit.check(10, session.user.id)
  // ...
}
```

## キャッシュ戦略

### revalidatePath

データ変更時に関連ページのキャッシュを無効化：

```typescript
// 単一パス
revalidatePath("/dashboard/tenants")

// 動的パス
revalidatePath(`/dashboard/tenants/${tenantId}`)

// レイアウトを含む全て
revalidatePath("/dashboard/tenants", "layout")
```

### Server Componentsのキャッシュ

```typescript
// 静的生成（デフォルト）
export default async function Page() {
  const data = await getData()
  return <div>{data}</div>
}

// 動的レンダリング
export const dynamic = "force-dynamic"

export default async function Page() {
  const data = await getData()
  return <div>{data}</div>
}

// 時間ベースの再検証
export const revalidate = 60 // 60秒

export default async function Page() {
  const data = await getData()
  return <div>{data}</div>
}
```

## ページネーション（今後実装）

### カーソルベース

```typescript
export async function getPayments(
  tenantId: string,
  cursor?: string,
  limit: number = 20
) {
  const payments = await db.query.payments.findMany({
    where: and(
      eq(payments.tenantId, tenantId),
      cursor ? lt(payments.createdAt, new Date(cursor)) : undefined
    ),
    limit: limit + 1, // 次ページ存在確認用
    orderBy: desc(payments.createdAt)
  })

  const hasMore = payments.length > limit
  const items = hasMore ? payments.slice(0, -1) : payments
  const nextCursor = hasMore
    ? items[items.length - 1].createdAt.toISOString()
    : null

  return { items, nextCursor, hasMore }
}
```

## ベストプラクティス

### 1. 認証チェックを必ず行う

```typescript
export async function anyAction() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }
  // ...
}
```

### 2. 入力検証

```typescript
export async function createTenant(formData: FormData) {
  const name = formData.get("name") as string

  if (!name || name.trim().length === 0) {
    throw new Error("Name is required")
  }

  if (name.length > 100) {
    throw new Error("Name is too long")
  }
  // ...
}
```

### 3. トランザクション使用

```typescript
await db.transaction(async (tx) => {
  const tenant = await tx.insert(tenants).values(...)
  await tx.insert(tenantMembers).values(...)
})
```

### 4. 適切なrevalidate

```typescript
// 作成・更新後
revalidatePath("/dashboard/tenants")

// 削除後
revalidatePath("/dashboard/tenants")
revalidatePath(`/dashboard/tenants/${tenantId}`)
```

### 5. エラーログ

```typescript
try {
  // ...
} catch (error) {
  console.error("Detailed error for debugging:", error)
  throw new Error("User-friendly error message")
}
```

## 将来の拡張

### GraphQL検討

大規模化した場合、GraphQLの導入も検討：

```graphql
query GetTenant($id: ID!) {
  tenant(id: $id) {
    id
    name
    members {
      id
      displayName
      user {
        name
      }
    }
    payments(limit: 10) {
      id
      title
      amount
    }
  }
}
```

### WebSocket/SSE

リアルタイム更新が必要な場合：

```typescript
// Server-Sent Events
export async function GET(request: Request) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // リアルタイム更新を送信
    }
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    }
  })
}
```

---

**最終更新: 2025-10-21**
