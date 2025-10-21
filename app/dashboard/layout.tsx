import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-semibold">割り勘管理</h1>
            <nav className="flex gap-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                ダッシュボード
              </Link>
              <Link
                href="/dashboard/tenants"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                グループ
              </Link>
              <Link
                href="/dashboard/payments"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                支払い
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {session.user.name}
            </div>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                ログアウト
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto py-6 px-4">{children}</main>
    </div>
  )
}
