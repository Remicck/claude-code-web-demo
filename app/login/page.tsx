import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">割り勘管理アプリ</h1>
          <p className="mt-2 text-muted-foreground">
            LINEアカウントまたはテストアカウントでログインしてください
          </p>
        </div>

        {/* LINE Login */}
        <Card>
          <CardHeader>
            <CardTitle>LINEでログイン</CardTitle>
            <CardDescription>本番環境用のログイン方法</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async () => {
                "use server"
                await signIn("line", { redirectTo: "/dashboard" })
              }}
            >
              <Button type="submit" className="w-full" size="lg">
                LINEでログイン
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Admin Login for E2E Testing */}
        <Card>
          <CardHeader>
            <CardTitle>管理者ログイン</CardTitle>
            <CardDescription>E2Eテスト用（admin / admin）</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={async (formData: FormData) => {
                "use server"
                await signIn("credentials", {
                  username: formData.get("username"),
                  password: formData.get("password"),
                  redirectTo: "/dashboard",
                })
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="username">ユーザー名</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="admin"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">パスワード</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="admin"
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                ログイン
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
