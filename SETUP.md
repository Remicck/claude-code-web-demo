# セットアップ手順一覧

このドキュメントは、Turso、GitHub、Vercelでの設定手順をまとめたものです。

## 前提条件

- Node.js 20以上がインストールされていること
- GitHubアカウントを持っていること
- LINE Developersアカウントを持っていること

## 1. Tursoのセットアップ

### 1-1. Turso CLIのインストール

```bash
# macOS/Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (PowerShell)
irm get.tur.so/windows | iex
```

### 1-2. Tursoアカウントの作成とログイン

```bash
# GitHubアカウントでログイン
turso auth login
```

ブラウザが開くので、GitHubでサインインします。

### 1-3. データベースの作成

```bash
# データベースを作成
turso db create warikan-app

# 作成されたデータベース一覧を確認
turso db list
```

### 1-4. データベース接続情報の取得

```bash
# データベースのURL取得
turso db show warikan-app

# 認証トークンの作成
turso db tokens create warikan-app
```

**重要: 以下の情報を控えておく**
- Database URL: `libsql://warikan-app-[username].turso.io`
- Auth Token: `eyJhbGciOiJS...` (長い文字列)

### 1-5. （オプション）ローカルでの接続テスト

```bash
# Turso Shell でデータベースに接続
turso db shell warikan-app

# 接続できたら .quit で終了
.quit
```

## 2. LINE Developersのセットアップ

### 2-1. LINE Developers Consoleへアクセス

https://developers.line.biz/console/ にアクセスし、LINEアカウントでログイン

### 2-2. プロバイダーの作成

1. 「Create a new provider」をクリック
2. Provider名を入力（例: `WarikanApp`）
3. 「Create」をクリック

### 2-3. LINE Loginチャネルの作成

1. 作成したプロバイダーを選択
2. 「Create a LINE Login channel」をクリック
3. 必要情報を入力:
   - Channel name: `割り勘管理アプリ`
   - Channel description: `グループで割り勘を管理するアプリ`
   - App types: `Web app` を選択
4. 利用規約に同意して「Create」

### 2-4. Channel Basic Settingsの設定

**Basic settings タブ:**
1. Channel IDをコピー（後で使用）
2. Channel secretの「Issue」をクリックしてシークレットを発行
3. Channel secretをコピー（後で使用）

### 2-5. LINE Loginの設定

**LINE Login タブ:**

1. **Callback URL の設定**
   - 開発環境: `http://localhost:3000/api/auth/callback/line`
   - 本番環境: `https://your-app.vercel.app/api/auth/callback/line` (後で追加)

2. **Email address permission**
   - 「Email address permission」を `Optional` に設定

**重要: 以下の情報を控えておく**
- Channel ID: `1234567890`
- Channel Secret: `abcdef123456...`

## 3. ローカル開発環境のセットアップ

### 3-1. リポジトリのクローンと依存関係インストール

```bash
# リポジトリをクローン（または既存のディレクトリに移動）
cd /path/to/claude-code-web-demo

# 依存関係のインストール
npm install
```

### 3-2. 環境変数の設定

`.env.local` ファイルをプロジェクトルートに作成：

```bash
# NextAuth.js
AUTH_SECRET=your-auth-secret-here # ↓コマンドで生成
# openssl rand -base64 32

# LINE Login
LINE_CHANNEL_ID=1234567890  # 手順2-4で取得
LINE_CHANNEL_SECRET=abcdef123456...  # 手順2-4で取得

# App URL
NEXTAUTH_URL=http://localhost:3000

# Turso Database
DATABASE_URL=libsql://warikan-app-xxx.turso.io  # 手順1-4で取得
DATABASE_AUTH_TOKEN=eyJhbGci...  # 手順1-4で取得
```

**AUTH_SECRETの生成:**
```bash
openssl rand -base64 32
```

### 3-3. データベースのマイグレーション

```bash
# マイグレーションの実行
npm run db:migrate
```

成功すると `Migrations completed!` と表示されます。

### 3-4. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセスして動作確認。

## 4. GitHubリポジトリのセットアップ

### 4-1. GitHubで新規リポジトリ作成（未作成の場合）

1. https://github.com/new にアクセス
2. Repository name: `warikan-app`
3. Private/Public を選択
4. 「Create repository」をクリック

### 4-2. ローカルリポジトリとの接続

```bash
# リモートリポジトリを追加（初回のみ）
git remote add origin https://github.com/yourusername/warikan-app.git

# プッシュ
git push -u origin main
```

## 5. Vercelへのデプロイ

### 5-1. Vercelアカウントの作成

1. https://vercel.com/signup にアクセス
2. GitHubアカウントでサインアップ

### 5-2. プロジェクトのインポート

1. Vercelダッシュボードで「Add New...」→「Project」
2. GitHubリポジトリを選択（warikan-app）
3. 「Import」をクリック

### 5-3. 環境変数の設定

**Environment Variables** セクションで以下を設定:

```
AUTH_SECRET=<openssl rand -base64 32 の結果>
LINE_CHANNEL_ID=<LINEのChannel ID>
LINE_CHANNEL_SECRET=<LINEのChannel Secret>
NEXTAUTH_URL=https://your-app.vercel.app
DATABASE_URL=<TursoのDatabase URL>
DATABASE_AUTH_TOKEN=<Tursoのトークン>
```

**重要:**
- `NEXTAUTH_URL` は後でVercelが割り当てたURLに更新する
- すべての環境変数を「Production」「Preview」「Development」すべてに設定

### 5-4. デプロイ

1. 「Deploy」ボタンをクリック
2. デプロイが完了するまで待機（1-2分）

### 5-5. デプロイURL の確認

デプロイ完了後、表示されるURLをコピー（例: `https://warikan-app-xxx.vercel.app`）

### 5-6. 環境変数の更新

1. Vercel Project Settings → Environment Variables
2. `NEXTAUTH_URL` を実際のURLに更新
3. 「Save」をクリック
4. 「Redeploy」で再デプロイ

## 6. LINE Loginのコールバック URL更新

### 6-1. LINE Developers Consoleで設定

1. LINE Developers Console → 該当チャネル → LINE Login タブ
2. Callback URL に本番URLを追加:
   ```
   https://your-app.vercel.app/api/auth/callback/line
   ```
3. 「Update」をクリック

**現在の状態:**
- 開発: `http://localhost:3000/api/auth/callback/line`
- 本番: `https://your-app.vercel.app/api/auth/callback/line`

両方登録されているので、どちらの環境でも動作します。

## 7. 動作確認

### 7-1. ローカル環境

```bash
npm run dev
```

1. http://localhost:3000 にアクセス
2. 「LINEでログイン」をクリック
3. LINE認証画面で認証
4. ダッシュボードにリダイレクトされることを確認

### 7-2. 本番環境

1. https://your-app.vercel.app にアクセス
2. 同様にLINEでログイン
3. 動作確認

## 8. 今後の運用

### データベースの確認

```bash
# Turso Shellでデータ確認
turso db shell warikan-app

# テーブル一覧
.tables

# ユーザー一覧
SELECT * FROM users;

# 終了
.quit
```

### Vercelでのログ確認

1. Vercel Dashboard → プロジェクト → Logs
2. エラーや警告を確認

### 環境変数の更新

**ローカル:**
- `.env.local` を編集
- サーバー再起動

**Vercel:**
1. Project Settings → Environment Variables
2. 変数を更新
3. Redeployで適用

### Tursoデータベースのバックアップ

```bash
# スナップショットの作成
turso db dump warikan-app > backup-$(date +%Y%m%d).sql
```

### トラブルシューティング

**問題: Vercelデプロイが失敗する**
```bash
# ローカルでビルドテスト
npm run build

# エラーを修正してから再デプロイ
```

**問題: LINE Loginが動かない**
- LINE Developers Consoleでコールバック URLを確認
- 環境変数 `LINE_CHANNEL_ID` と `LINE_CHANNEL_SECRET` を確認
- `NEXTAUTH_URL` が正しいか確認

**問題: データベース接続エラー**
- Tursoのトークンが有効か確認
- DATABASE_URL と DATABASE_AUTH_TOKEN を再確認
- Turso CLIで接続テスト: `turso db shell warikan-app`

## まとめ

設定が必要な箇所:

| サービス | 設定内容 | 取得方法 |
|---------|---------|---------|
| **Turso** | DATABASE_URL | `turso db show warikan-app` |
| **Turso** | DATABASE_AUTH_TOKEN | `turso db tokens create warikan-app` |
| **LINE** | LINE_CHANNEL_ID | LINE Developers Console → Basic settings |
| **LINE** | LINE_CHANNEL_SECRET | LINE Developers Console → Basic settings |
| **LINE** | Callback URL | `http://localhost:3000/api/auth/callback/line`<br>`https://your-app.vercel.app/api/auth/callback/line` |
| **Auth** | AUTH_SECRET | `openssl rand -base64 32` |
| **Vercel** | 全環境変数 | Project Settings → Environment Variables |
| **Vercel** | NEXTAUTH_URL | デプロイ後のURL |

これで完了です。何か問題があれば、各セクションのトラブルシューティングを参照してください。

---

**最終更新: 2025-10-21**
