# CLAUDE.md - Claude Code開発ガイド

このドキュメントは、Claude Codeを使用してこのプロジェクトを効率的に開発するためのガイドです。

## プロジェクト概要

**割り勘管理アプリ** - LINEアカウントでログインできる、マルチテナント対応の割り勘・支払い管理アプリケーション

### 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **認証**: NextAuth.js v5 (LINE Provider)
- **データベース**: SQLite + Drizzle ORM
- **UI**: Shadcn UI + Tailwind CSS v4
- **ID管理**: UUIDv7

## ドキュメント構成

詳細な仕様やガイドラインは `/doc` ディレクトリに配置されています：

- **[データベーススキーマ](./doc/database-schema.md)** - 全テーブル定義とリレーション
- **[アーキテクチャ](./doc/architecture.md)** - システム構成と設計思想
- **[開発ガイドライン](./doc/development-guide.md)** - コーディング規約とベストプラクティス
- **[API設計](./doc/api-design.md)** - Server Actionsとエンドポイント設計

## Claude Codeでの開発フロー

### 1. 新機能開発時

```markdown
1. 仕様確認
   - `/doc` 内の関連ドキュメントを確認
   - データベーススキーマを確認（特にリレーション）

2. 実装計画
   - TodoWriteツールでタスクを分解
   - 依存関係を明確化

3. 実装
   - Server Actions → UI Components → Pages の順で実装
   - 各ステップでTodoWriteを更新

4. コミット
   - 機能単位でコミット
   - 日本語でわかりやすいコミットメッセージ
```

### 2. ファイル構成の理解

```
app/
├── api/auth/[...nextauth]/  # 認証API（触らない）
├── dashboard/               # メインアプリケーション
│   ├── layout.tsx          # 共通レイアウト
│   ├── page.tsx            # ダッシュボード
│   ├── tenants/            # グループ管理
│   ├── payments/           # 支払い管理（実装予定）
│   └── settings/           # 設定（実装予定）
├── login/                  # ログインページ
└── page.tsx                # ルート（リダイレクトのみ）

lib/
├── db/
│   ├── schema.ts           # データベーススキーマ（重要）
│   ├── index.ts            # DB接続
│   └── migrations/         # マイグレーションファイル
├── actions/                # Server Actions（ビジネスロジック）
├── utils.ts                # ユーティリティ関数
└── uuid.ts                 # UUIDv7生成

components/
├── ui/                     # Shadcn UIコンポーネント
└── [feature]/              # 機能別コンポーネント
```

## VibeCoding ベストプラクティス

### 原則1: コンテキストを明確に保つ

```markdown
✅ 良い例:
「テナント詳細ページに支払い履歴セクションを追加してください。
 lib/db/schema.ts のpaymentsテーブルを使用し、
 最新5件を表示する形式でお願いします。」

❌ 悪い例:
「支払い履歴を追加して」
```

### 原則2: ファイルパスを明示

```markdown
✅ 良い例:
「app/dashboard/tenants/[id]/page.tsx に...」

❌ 悪い例:
「テナント詳細ページに...」（どのファイルか曖昧）
```

### 原則3: データベース変更は慎重に

```markdown
1. schema.ts を変更した場合：
   npm run db:generate  # マイグレーション生成
   npm run db:migrate   # マイグレーション実行

2. 既存データがある場合は必ず確認
3. リレーションの整合性を保つ
```

### 原則4: 型安全性を優先

```typescript
// ✅ 良い例: Drizzle ORMの型を活用
import { tenants } from "@/lib/db/schema"
type Tenant = typeof tenants.$inferSelect

// ❌ 悪い例: any を使用
const tenant: any = await getTenant()
```

### 原則5: Server ActionsとClient Componentsを分離

```typescript
// ✅ Server Actions (lib/actions/*.ts)
"use server"
export async function createTenant(formData: FormData) { ... }

// ✅ Client Component (components/**/*.tsx)
"use client"
export function CreateTenantDialog() { ... }

// ❌ 混在させない
```

## 開発時の注意事項

### データベース操作

1. **必ずトランザクションを考慮**
   ```typescript
   // 複数テーブルへの挿入は一貫性を保つ
   await db.insert(tenants).values(...)
   await db.insert(tenantMembers).values(...)
   ```

2. **UUIDv7を使用**
   ```typescript
   import { generateId } from "@/lib/uuid"
   const id = generateId() // UUIDv7
   ```

3. **日付はDate型で統一**
   ```typescript
   createdAt: new Date()  // ✅
   createdAt: Date.now()  // ❌
   ```

### 認証とセキュリティ

1. **Server Actionsでは必ず認証チェック**
   ```typescript
   export async function createTenant() {
     const session = await auth()
     if (!session?.user?.id) {
       throw new Error("Unauthorized")
     }
     // ...
   }
   ```

2. **テナント権限チェック**
   ```typescript
   // ユーザーがテナントのメンバーか確認
   const membership = await db.query.tenantMembers.findFirst({
     where: and(
       eq(tenantMembers.tenantId, tenantId),
       eq(tenantMembers.userId, session.user.id)
     )
   })
   if (!membership) throw new Error("Access denied")
   ```

### UI/UX

1. **loading状態を必ず実装**
   ```typescript
   const [loading, setLoading] = useState(false)
   <Button disabled={loading}>
     {loading ? "処理中..." : "送信"}
   </Button>
   ```

2. **エラーハンドリング**
   ```typescript
   try {
     await action()
   } catch (error) {
     console.error(error)
     alert("エラーが発生しました") // ユーザーへの通知
   }
   ```

3. **revalidatePathで画面更新**
   ```typescript
   // Server Action内で
   revalidatePath("/dashboard/tenants")
   ```

## よくある操作

### 新しいページを追加

```bash
# 1. ページファイル作成
app/dashboard/[feature]/page.tsx

# 2. ナビゲーションに追加
app/dashboard/layout.tsx

# 3. Server Actions作成
lib/actions/[feature].ts
```

### 新しいUIコンポーネントを追加

```bash
# Shadcn UIコンポーネントは手動で作成
components/ui/[component].tsx

# 機能別コンポーネント
components/[feature]/[component].tsx
```

### データベーススキーマ変更

```bash
# 1. schema.ts編集
lib/db/schema.ts

# 2. マイグレーション生成
npm run db:generate

# 3. マイグレーション実行
npm run db:migrate

# 4. 型チェック
npm run build
```

## トラブルシューティング

### データベース関連

**問題**: マイグレーションが失敗する
```bash
# 解決策1: データベースをリセット
rm -rf data/
npm run db:migrate

# 解決策2: マイグレーションファイルを確認
lib/db/migrations/
```

**問題**: 型エラーが出る
```typescript
// schema.tsの変更後は必ず
npm run db:generate
```

### 認証関連

**問題**: LINE Loginが動かない
```bash
# .env.localを確認
LINE_CHANNEL_ID=xxx
LINE_CHANNEL_SECRET=xxx
AUTH_SECRET=xxx
NEXTAUTH_URL=http://localhost:3000
```

**問題**: セッションが取得できない
```typescript
// Page Componentでは
const session = await auth()

// Client Componentでは
import { useSession } from "next-auth/react"
const { data: session } = useSession()
```

## コミットガイドライン

### コミットメッセージの形式

```
[機能名] 簡潔な変更内容

- 詳細な変更点1
- 詳細な変更点2
- 影響範囲や注意点

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 例

```
テナント管理機能の実装

- グループ作成機能（CreateTenantDialog）
- グループ一覧表示ページ
- Server Actions（createTenant, getTenants）
- ダッシュボードに実際のグループ数を表示

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## 開発の進め方

### フェーズ1: 基盤（完了✅）
- [x] 認証機能
- [x] データベース設計
- [x] 基本レイアウト
- [x] テナント管理

### フェーズ2: コア機能（進行中）
- [ ] 支払い記録機能
- [ ] 分配設定機能
- [ ] 清算ログ管理
- [ ] 支払い方法設定

### フェーズ3: 拡張機能（未着手）
- [ ] 通知機能
- [ ] レポート機能
- [ ] エクスポート機能
- [ ] モバイル最適化

## Claude Codeへの質問例

効率的な開発のため、以下のような質問を推奨します：

```markdown
# 良い質問例

1. 「/doc/database-schema.md を参照して、支払い記録機能の
   Server Actionsを実装してください」

2. 「app/dashboard/tenants/[id]/page.tsx に、
   支払い履歴セクションを追加してください。
   最新5件を表示し、日付の新しい順にソートしてください」

3. 「components/payments/create-payment-dialog.tsx を作成し、
   支払い記録を作成できるようにしてください。
   メンバー選択と金額入力、均等分割のチェックボックスを含めてください」

# 避けるべき曖昧な質問

1. 「支払い機能を作って」
   → 何の支払い？どの画面？どの程度の機能？

2. 「エラーを修正して」
   → どのエラー？どのファイル？

3. 「これを改善して」
   → 何を？どのように？
```

## リファレンス

### 重要ドキュメント
- [Next.js App Router](https://nextjs.org/docs/app)
- [Drizzle ORM](https://orm.drizzle.team/)
- [NextAuth.js v5](https://authjs.dev/)
- [Shadcn UI](https://ui.shadcn.com/)

### プロジェクト内ドキュメント
- `/doc/database-schema.md` - データベース設計
- `/doc/architecture.md` - アーキテクチャ
- `/doc/development-guide.md` - 開発ガイド
- `/doc/api-design.md` - API設計

---

**このドキュメントは開発の進行に合わせて更新してください。**
