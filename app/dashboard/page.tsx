import { auth } from "@/auth"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground">
          ようこそ、{session.user.name}さん
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>グループ</CardTitle>
            <CardDescription>参加中のグループ数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>未清算</CardTitle>
            <CardDescription>清算待ちの金額</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">¥0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>支払い記録</CardTitle>
            <CardDescription>今月の支払い記録数</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>最近の活動</CardTitle>
          <CardDescription>最新の支払いと清算の履歴</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            まだ活動がありません。グループを作成して始めましょう。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
