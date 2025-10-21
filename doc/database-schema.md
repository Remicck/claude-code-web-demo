# データベーススキーマ設計

## 概要

Turso (LibSQL) を使用したマルチテナント対応の割り勘管理システム。全てのIDにUUIDv7を使用。

**Tursoについて:**
- LibSQL: SQLiteの互換フォーク（サーバーレス環境向け）
- エッジ配置可能なデータベース
- 低レイテンシのグローバル配信

## ER図（概念）

```
users (ユーザー)
  ↓
  ├─ tenants (作成者として)
  └─ tenant_members (メンバーとして)
       ↓
       ├─ payment_methods (支払い方法)
       ├─ payments (支払い記録 - paidBy)
       ├─ payment_splits (支払い分配)
       └─ settlement_logs (清算ログ - fromMember/toMember)
```

## テーブル詳細

### 1. users（ユーザー）

LINEアカウントでログインしたユーザーの基本情報。

```typescript
{
  id: string              // UUIDv7 - 主キー
  lineId: string          // LINE User ID - ユニーク
  displayName: string     // 表示名
  pictureUrl: string?     // プロフィール画像URL
  email: string?          // メールアドレス
  createdAt: Date         // 作成日時
  updatedAt: Date         // 更新日時
}
```

**制約:**
- `lineId` はユニーク制約
- LINE Loginで自動的に作成される

**リレーション:**
- `tenants.createdById` → 作成したテナント（1:N）
- `tenant_members.userId` → 参加しているテナント（1:N）

### 2. tenants（テナント/グループ）

割り勘グループの基本情報。

```typescript
{
  id: string              // UUIDv7 - 主キー
  name: string            // グループ名
  description: string?    // 説明
  createdById: string     // 作成者のユーザーID (→ users.id)
  createdAt: Date         // 作成日時
  updatedAt: Date         // 更新日時
}
```

**制約:**
- `createdById` は外部キー（users.id）

**リレーション:**
- `users.id` ← 作成者（N:1）
- `tenant_members.tenantId` → メンバー（1:N）
- `payments.tenantId` → 支払い記録（1:N）

### 3. tenant_members（テナントメンバー）

ユーザーとテナントの関連を管理。同じユーザーが同じテナントに複数のメンバーとして登録可能（例：個人用、法人用など）。

```typescript
{
  id: string              // UUIDv7 - 主キー
  tenantId: string        // テナントID (→ tenants.id)
  userId: string          // ユーザーID (→ users.id)
  displayName: string     // テナント内での表示名
  role: string            // 役割: "owner" | "admin" | "member"
  joinedAt: Date          // 参加日時
}
```

**制約:**
- `tenantId` は外部キー（tenants.id）、CASCADE DELETE
- `userId` は外部キー（users.id）、CASCADE DELETE

**役割（role）の説明:**
- `owner`: テナント作成者、全権限
- `admin`: メンバー管理、支払い管理が可能
- `member`: 自分の支払いのみ管理可能

**リレーション:**
- `tenants.id` ← テナント（N:1）
- `users.id` ← ユーザー（N:1）
- `payment_methods.tenantMemberId` → 支払い方法（1:N）
- `payments.paidById` → 支払い記録（1:N）
- `payment_splits.tenantMemberId` → 支払い分配（1:N）

### 4. payment_methods（支払い方法）

テナントメンバーごとの支払い方法設定。

```typescript
{
  id: string              // UUIDv7 - 主キー
  tenantMemberId: string  // メンバーID (→ tenant_members.id)
  type: string            // 種別（後述）
  label: string           // 表示名（例: "三菱UFJ銀行"）
  accountInfo: string?    // 口座情報（JSON文字列）
  priority: number        // 優先順位（0が最優先）
  isActive: boolean       // 有効/無効
  createdAt: Date         // 作成日時
  updatedAt: Date         // 更新日時
}
```

**制約:**
- `tenantMemberId` は外部キー（tenant_members.id）、CASCADE DELETE

**支払い方法の種別（type）:**
```typescript
type PaymentMethodType =
  | "bank_transfer"  // 銀行振込
  | "paypay"         // PayPay
  | "line_pay"       // LINE Pay
  | "cash"           // 現金
  | "other"          // その他
```

**accountInfo の構造例:**
```json
// bank_transfer
{
  "bankName": "三菱UFJ銀行",
  "branchName": "東京支店",
  "accountType": "普通",
  "accountNumber": "1234567",
  "accountHolder": "ヤマダ タロウ"
}

// paypay
{
  "paypayId": "yamada-taro"
}

// line_pay
{
  "linePayId": "@yamada"
}
```

**リレーション:**
- `tenant_members.id` ← メンバー（N:1）
- `settlement_logs.paymentMethodId` → 清算ログ（1:N）

### 5. payments（支払い記録）

実際の支払い記録。

```typescript
{
  id: string              // UUIDv7 - 主キー
  tenantId: string        // テナントID (→ tenants.id)
  paidById: string        // 支払った人 (→ tenant_members.id)
  title: string           // タイトル（例: "夕食代"）
  description: string?    // 説明
  totalAmount: number     // 合計金額
  paidAt: Date            // 支払い日時
  createdAt: Date         // 作成日時
  updatedAt: Date         // 更新日時
}
```

**制約:**
- `tenantId` は外部キー（tenants.id）、CASCADE DELETE
- `paidById` は外部キー（tenant_members.id）

**リレーション:**
- `tenants.id` ← テナント（N:1）
- `tenant_members.id` ← 支払い者（N:1）
- `payment_splits.paymentId` → 分配（1:N）

### 6. payment_splits（支払い分配）

支払いをどのメンバーに、いくら分配するかの記録。

```typescript
{
  id: string              // UUIDv7 - 主キー
  paymentId: string       // 支払いID (→ payments.id)
  tenantMemberId: string  // メンバーID (→ tenant_members.id)
  amount: number          // 負担金額
  isPaid: boolean         // 清算済みか
  paidAt: Date?           // 清算日時
  createdAt: Date         // 作成日時
  updatedAt: Date         // 更新日時
}
```

**制約:**
- `paymentId` は外部キー（payments.id）、CASCADE DELETE
- `tenantMemberId` は外部キー（tenant_members.id）

**ビジネスルール:**
- `SUM(amount)` = `payments.totalAmount` となるべき
- 支払った本人も含めてsplitレコードを作成
- 均等分割の場合: `amount = totalAmount / メンバー数`

**リレーション:**
- `payments.id` ← 支払い（N:1）
- `tenant_members.id` ← メンバー（N:1）
- `settlement_logs.paymentSplitId` → 清算ログ（1:N）

### 7. settlement_logs（清算ログ）

実際の清算（送金）の履歴。

```typescript
{
  id: string              // UUIDv7 - 主キー
  paymentSplitId: string  // 分配ID (→ payment_splits.id)
  fromMemberId: string    // 送金者 (→ tenant_members.id)
  toMemberId: string      // 受取人 (→ tenant_members.id)
  amount: number          // 金額
  paymentMethodId: string?// 使用した支払い方法 (→ payment_methods.id)
  note: string?           // メモ
  settledAt: Date         // 清算日時
  createdAt: Date         // 作成日時
}
```

**制約:**
- `paymentSplitId` は外部キー（payment_splits.id）
- `fromMemberId` は外部キー（tenant_members.id）
- `toMemberId` は外部キー（tenant_members.id）
- `paymentMethodId` は外部キー（payment_methods.id）、NULL可

**ビジネスルール:**
- `fromMemberId` = 負担者（payment_splits.tenantMemberId）
- `toMemberId` = 支払い者（payments.paidById）
- `amount` = 清算金額（≤ payment_splits.amount）
- 清算ログが作成されたら `payment_splits.isPaid = true` に更新

**リレーション:**
- `payment_splits.id` ← 分配（N:1）
- `tenant_members.id` ← 送金者（N:1）
- `tenant_members.id` ← 受取人（N:1）
- `payment_methods.id` ← 支払い方法（N:1）

## クエリパターン

### よく使うクエリ例

#### 1. ユーザーの参加テナント一覧

```typescript
await db.query.tenantMembers.findMany({
  where: eq(tenantMembers.userId, userId),
  with: {
    tenant: {
      with: {
        createdBy: true,
      },
    },
  },
})
```

#### 2. テナントのメンバー一覧

```typescript
await db.query.tenants.findFirst({
  where: eq(tenants.id, tenantId),
  with: {
    members: {
      with: {
        user: true,
      },
    },
  },
})
```

#### 3. 未清算の金額計算

```typescript
// メンバーごとの未清算金額
await db.query.paymentSplits.findMany({
  where: and(
    eq(paymentSplits.tenantMemberId, memberId),
    eq(paymentSplits.isPaid, false)
  ),
  with: {
    payment: true,
  },
})
```

#### 4. 支払い履歴（分配含む）

```typescript
await db.query.payments.findMany({
  where: eq(payments.tenantId, tenantId),
  with: {
    paidBy: true,
    splits: {
      with: {
        tenantMember: true,
      },
    },
  },
  orderBy: desc(payments.paidAt),
})
```

## マイグレーション管理

### スキーマ変更時の手順

```bash
# 1. lib/db/schema.ts を編集

# 2. マイグレーションファイル生成
npm run db:generate

# 3. 生成されたSQLを確認
cat lib/db/migrations/XXXX_*.sql

# 4. マイグレーション実行
npm run db:migrate

# 5. 型チェック
npm run build
```

### ロールバック

```bash
# Tursoでのデータベースリセット
turso db destroy warikan-app
turso db create warikan-app

# 新しいトークンとURLで環境変数を更新
turso db tokens create warikan-app
turso db show warikan-app

# マイグレーション再実行
npm run db:migrate
```

## パフォーマンス考慮事項

### インデックス戦略

現在は以下のインデックスのみ：
- `users.lineId` (UNIQUE)

今後追加を検討：
- `tenant_members(tenantId, userId)` - メンバーシップ検索
- `payments(tenantId, paidAt)` - 支払い履歴表示
- `payment_splits(paymentId, isPaid)` - 未清算検索

### N+1問題の回避

Drizzle ORMの `with` を活用してリレーションを事前読み込み：

```typescript
// ✅ 良い例
await db.query.tenants.findMany({
  with: {
    members: {
      with: { user: true }
    }
  }
})

// ❌ 悪い例
const tenants = await db.query.tenants.findMany()
for (const tenant of tenants) {
  const members = await db.query.tenantMembers.findMany({
    where: eq(tenantMembers.tenantId, tenant.id)
  })
}
```

## セキュリティ考慮事項

### アクセス制御

1. **テナントデータアクセス**
   - 必ずユーザーがテナントのメンバーか確認

2. **権限チェック**
   - owner/admin権限が必要な操作を明確化

3. **データ削除**
   - CASCADE DELETEを適切に設定
   - 論理削除も検討（将来の拡張）

### 個人情報保護

1. **支払い方法の暗号化**
   - 現在はJSON文字列で平文保存
   - 本番環境では暗号化を検討

2. **監査ログ**
   - 重要な操作はログに記録
   - settlement_logsが実質的な監査ログ

## 今後の拡張

### 予定されている変更

1. **通知テーブル**
   ```typescript
   notifications {
     id, userId, type, content, isRead, createdAt
   }
   ```

2. **定期支払いテーブル**
   ```typescript
   recurring_payments {
     id, tenantId, title, amount, frequency, nextPaymentDate
   }
   ```

3. **カテゴリテーブル**
   ```typescript
   payment_categories {
     id, tenantId, name, color
   }
   ```

---

**最終更新: 2025-10-21**
