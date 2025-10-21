# アーキテクチャ設計

## システム概要

割り勘管理アプリは、Next.js 15のApp Routerを使用したフルスタックWebアプリケーションです。
SPAとして動作し、サーバーサイドレンダリング（SSR）とServer Actionsを活用しています。

## アーキテクチャ図

```
┌─────────────────────────────────────────────────┐
│                  ブラウザ                        │
│  ┌─────────────────────────────────────────┐   │
│  │     React Components (Client)            │   │
│  │  - UI Components (Shadcn UI)             │   │
│  │  - Feature Components                    │   │
│  │  - Forms & Dialogs                       │   │
│  └──────────────┬──────────────────────────┘   │
│                 │ fetch/form action             │
└─────────────────┼─────────────────────────────┘
                  │
┌─────────────────┼─────────────────────────────┐
│                 ▼     Next.js Server           │
│  ┌──────────────────────────────────────────┐ │
│  │      App Router (Pages/Layouts)          │ │
│  │  - Server Components                     │ │
│  │  - Metadata & SEO                        │ │
│  └──────────┬────────────────┬──────────────┘ │
│             │                │                  │
│  ┌──────────▼─────────┐   ┌─▼────────────┐   │
│  │  Server Actions    │   │  Middleware  │   │
│  │  - Business Logic  │   │  - Auth Check│   │
│  │  - Validation      │   │  - Redirect  │   │
│  │  - DB Operations   │   └──────────────┘   │
│  └──────────┬─────────┘                        │
│             │                                   │
│  ┌──────────▼─────────────────────────────┐   │
│  │      NextAuth.js (Auth.js v5)          │   │
│  │  - LINE Login Provider                 │   │
│  │  - Session Management                  │   │
│  └──────────┬─────────────────────────────┘   │
│             │                                   │
│  ┌──────────▼─────────────────────────────┐   │
│  │       Drizzle ORM                      │   │
│  │  - Type-safe queries                   │   │
│  │  - Relation mapping                    │   │
│  └──────────┬─────────────────────────────┘   │
│             │                                   │
│  ┌──────────▼─────────────────────────────┐   │
│  │       SQLite Database                  │   │
│  │  - Local file storage                  │   │
│  │  - ACID transactions                   │   │
│  └────────────────────────────────────────┘   │
└───────────────────────────────────────────────┘
```

## 技術スタック詳細

### フロントエンド

**React 19.1.0**
- Server Components をデフォルト使用
- Client Components は必要な箇所のみ（"use client"）
- Suspenseによる段階的レンダリング

**Shadcn UI + Tailwind CSS v4**
- ヘッドレスUIコンポーネント（Radix UI）
- Tailwind CSS v4の新しいengine
- CSS変数によるテーマ管理

### バックエンド

**Next.js 15 App Router**
- ファイルベースルーティング
- Server ActionsによるAPI不要のデータ操作
- Middlewareによる認証チェック

**NextAuth.js v5 (Auth.js)**
- LINE Providerによるソーシャルログイン
- JWTベースのセッション管理
- サーバーサイド認証チェック

**Drizzle ORM + Turso**
- TypeScript-firstのORM
- Zero-cost抽象化
- Relation query支援
- Turso (LibSQL) によるサーバーレス対応

### インフラ

**開発環境:**
- Turbopack（高速バンドラー）
- Hot Module Replacement (HMR)
- TypeScript型チェック

**本番環境:**
- Vercel（推奨）
- Turso（LibSQL - サーバーレス対応）
- Redis（セッションキャッシュ - 将来実装）

## ディレクトリ構造と責務

```
プロジェクトルート/
│
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   └── auth/[...nextauth]/   # 認証エンドポイント
│   │       └── route.ts          # NextAuth.jsハンドラー
│   │
│   ├── (auth)/                   # 認証グループ（レイアウト共有）
│   │   └── login/                # ログインページ
│   │       └── page.tsx          # Server Component
│   │
│   ├── dashboard/                # 認証後エリア
│   │   ├── layout.tsx            # 共通レイアウト（ヘッダー、ナビ）
│   │   ├── page.tsx              # ダッシュボードトップ
│   │   ├── tenants/              # グループ管理
│   │   │   ├── page.tsx          # 一覧
│   │   │   └── [id]/             # 詳細（動的ルート）
│   │   │       └── page.tsx
│   │   ├── payments/             # 支払い管理（予定）
│   │   └── settings/             # 設定（予定）
│   │
│   ├── globals.css               # グローバルスタイル
│   ├── layout.tsx                # ルートレイアウト
│   └── page.tsx                  # ルートページ（リダイレクト）
│
├── components/                   # Reactコンポーネント
│   ├── ui/                       # Shadcn UIコンポーネント
│   │   ├── button.tsx            # ベースUI
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   └── [feature]/                # 機能別コンポーネント
│       ├── create-tenant-dialog.tsx
│       └── ...
│
├── lib/                          # ライブラリ・ユーティリティ
│   ├── db/                       # データベース層
│   │   ├── schema.ts             # Drizzleスキーマ定義
│   │   ├── index.ts              # DB接続インスタンス
│   │   ├── migrate.ts            # マイグレーション実行スクリプト
│   │   └── migrations/           # 生成されたマイグレーション
│   │
│   ├── actions/                  # Server Actions
│   │   ├── tenants.ts            # テナント関連
│   │   ├── payments.ts           # 支払い関連（予定）
│   │   └── ...
│   │
│   ├── utils.ts                  # 共通ユーティリティ（cn等）
│   └── uuid.ts                   # UUIDv7生成
│
├── doc/                          # ドキュメント
│   ├── database-schema.md
│   ├── architecture.md           # このファイル
│   ├── development-guide.md
│   └── api-design.md
│
├── public/                       # 静的ファイル
│
├── auth.ts                       # NextAuth.js設定
├── auth.config.ts                # 認証設定オブジェクト
├── middleware.ts                 # Next.js middleware
├── drizzle.config.ts             # Drizzle設定
├── next.config.ts                # Next.js設定
├── tailwind.config.ts            # Tailwind設定
├── tsconfig.json                 # TypeScript設定
├── CLAUDE.md                     # Claude Code開発ガイド
└── README.md                     # プロジェクト概要
```

## データフロー

### 1. ページ表示フロー

```
ユーザーアクセス
  ↓
middleware.ts（認証チェック）
  ↓
app/dashboard/page.tsx（Server Component）
  ↓
Server Actions呼び出し（getTenants等）
  ↓
Drizzle ORM → SQLite
  ↓
データ取得
  ↓
React Server Componentレンダリング
  ↓
HTMLをクライアントへ送信
```

### 2. フォーム送信フロー

```
Client Component（form）
  ↓
Server Action呼び出し（createTenant等）
  ↓
  1. 認証チェック（auth()）
  2. バリデーション
  3. DBトランザクション開始
  4. データ挿入/更新
  5. トランザクションコミット
  6. revalidatePath（キャッシュ無効化）
  ↓
成功/失敗をクライアントへ返す
  ↓
Client Component（結果処理）
  - 成功: ダイアログ閉じる、router.refresh()
  - 失敗: エラー表示
```

### 3. 認証フロー

```
未認証ユーザー
  ↓
/login ページ
  ↓
「LINEでログイン」ボタン
  ↓
signIn("line") 呼び出し
  ↓
LINE認証画面へリダイレクト
  ↓
ユーザー認証・同意
  ↓
/api/auth/callback/line へコールバック
  ↓
auth.ts の signIn callback
  - ユーザー存在確認
  - 存在しない場合: users テーブルへ挿入
  - 存在する場合: 情報更新
  ↓
セッション作成
  ↓
/dashboard へリダイレクト
```

## レイヤー設計

### プレゼンテーション層（UI）

**責務:**
- ユーザーインタラクション処理
- データの表示
- バリデーション（クライアント側）

**コンポーネント分類:**

1. **Server Components**（デフォルト）
   - ページコンポーネント（page.tsx）
   - レイアウトコンポーネント（layout.tsx）
   - データ取得を含む静的コンポーネント

2. **Client Components**（"use client"）
   - インタラクティブUI（ダイアログ、フォーム）
   - 状態管理が必要なコンポーネント
   - イベントハンドラーを持つコンポーネント

### ビジネスロジック層

**責務:**
- ドメインロジック実装
- データ整合性の保証
- トランザクション管理

**実装場所:**
- `lib/actions/*.ts` - Server Actions
- バリデーション、権限チェック、DB操作

**パターン:**
```typescript
export async function createTenant(formData: FormData) {
  // 1. 認証チェック
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  // 2. 入力バリデーション
  const name = formData.get("name")
  if (!name) throw new Error("Name required")

  // 3. ビジネスロジック実行
  const tenantId = generateId()
  await db.transaction(async (tx) => {
    await tx.insert(tenants).values(...)
    await tx.insert(tenantMembers).values(...)
  })

  // 4. キャッシュ無効化
  revalidatePath("/dashboard/tenants")

  return { success: true, tenantId }
}
```

### データアクセス層

**責務:**
- データベース操作
- クエリ最適化
- リレーション管理

**実装:**
- Drizzle ORM経由でのDB操作
- `lib/db/schema.ts` でスキーマ定義
- `lib/db/index.ts` でDB接続

**クエリパターン:**
```typescript
// リレーション込みの取得
await db.query.tenants.findFirst({
  where: eq(tenants.id, id),
  with: {
    members: {
      with: { user: true }
    }
  }
})
```

## セキュリティアーキテクチャ

### 認証・認可

**レイヤー別の認証チェック:**

1. **Middleware層**（middleware.ts）
   - 全リクエストで実行
   - 未認証ユーザーを/loginへリダイレクト
   - 認証済みユーザーが/loginアクセス時は/dashboardへ

2. **Page層**（Server Components）
   - `await auth()` でセッション取得
   - セッションなければリダイレクト

3. **Server Actions層**
   - 全てのActionで認証チェック必須
   - テナントメンバーシップ確認
   - ロール（owner/admin/member）チェック

### データ保護

**アクセス制御:**
```typescript
// テナントデータアクセス時の権限チェック
const membership = await db.query.tenantMembers.findFirst({
  where: and(
    eq(tenantMembers.tenantId, tenantId),
    eq(tenantMembers.userId, session.user.id)
  )
})
if (!membership) {
  throw new Error("Access denied")
}
```

**マルチテナント分離:**
- 全てのクエリに`tenantId`フィルタを適用
- ユーザーは自分が参加しているテナントのデータのみアクセス可能
- テナント間のデータ漏洩を防止

## パフォーマンス戦略

### Server Components活用

**メリット:**
- JavaScriptバンドルサイズ削減
- サーバー側でのデータ取得（低レイテンシ）
- SEO対応

**使い分け:**
```typescript
// ✅ Server Component（デフォルト）
async function TenantList() {
  const tenants = await getTenants() // サーバー側で実行
  return <div>{tenants.map(...)}</div>
}

// ✅ Client Component（必要な場合のみ）
"use client"
function CreateDialog() {
  const [open, setOpen] = useState(false)
  return <Dialog open={open}>...</Dialog>
}
```

### キャッシング戦略

**Next.js Cache:**
- Server Componentsは自動的にキャッシュ
- `revalidatePath()`で特定パスを無効化
- Dynamic Routeは自動的にキャッシュなし

**データキャッシュ:**
```typescript
// キャッシュ制御
export const revalidate = 60 // 60秒ごとに再検証
```

### データベース最適化

1. **N+1クエリ回避**
   - Drizzle ORMの`with`を使用
   - 必要なリレーションを事前読み込み

2. **インデックス**
   - 頻繁に検索される列にインデックス
   - 現在は`users.lineId`のみ（UNIQUE）
   - 今後追加予定: 複合インデックス

## スケーラビリティ考慮

### 現在のアーキテクチャの制限

1. **Turso (LibSQL)**
   - サーバーレス環境で動作
   - 自動スケーリング対応
   - 必要に応じてレプリカ追加可能

2. **ファイルストレージ**
   - 画像等はまだ未対応
   - S3等のオブジェクトストレージ導入が必要

### 将来の拡張計画

**Phase 1: データベーススケーリング**
```bash
# Tursoでのレプリカ追加
turso db replicate warikan-app --location nrt
turso db replicate warikan-app --location sjc
```

**Phase 2: キャッシュレイヤー追加**
```typescript
// Redisキャッシング
// セッション、よく使うクエリ結果
```

**Phase 3: バックグラウンドジョブ**
```typescript
// 通知送信、定期支払い処理
// Vercel Cron Jobsまたは別ワーカー
```

## モニタリング・ロギング

### 現在の実装

**ログ出力:**
```typescript
// Server Actionsでのエラーログ
catch (error) {
  console.error("Failed to create tenant:", error)
  throw error
}
```

### 今後の実装

1. **構造化ロギング**
   - JSON形式でのログ出力
   - ログレベル管理

2. **エラートラッキング**
   - Sentry等の導入
   - エラーの集約・通知

3. **パフォーマンスモニタリング**
   - Next.js Analytics
   - データベースクエリ時間計測

## デプロイメントアーキテクチャ

### 開発環境

```
ローカルマシン
├── Next.js Dev Server (Turbopack)
├── Turso Database (Cloud)
└── LINE Login (Tunnel経由でテスト可能)
```

### 本番環境（Vercel）

```
Vercel Platform
├── Next.js App (Serverless Functions)
├── Static Assets (CDN配信)
└── External Services
    ├── Turso (LibSQL Database)
    ├── Redis (Upstash - 将来実装)
    └── LINE Login (Production Credentials)
```

## まとめ

このアーキテクチャは以下の特徴を持ちます：

1. **モダンなNext.js 15パターン**
   - App Router
   - Server Components優先
   - Server Actions

2. **型安全性の重視**
   - TypeScript全面採用
   - Drizzle ORMの型推論

3. **セキュリティファースト**
   - 多層的な認証チェック
   - マルチテナント分離

4. **拡張性の考慮**
   - レイヤー分離
   - 将来のスケール対応

---

**最終更新: 2025-10-21**
