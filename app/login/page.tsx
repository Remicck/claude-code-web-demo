import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">割り勘管理アプリ</h1>
          <p className="mt-2 text-muted-foreground">
            LINEアカウントでログインしてください
          </p>
        </div>

        <form
          action={async () => {
            "use server"
            await signIn("line", { redirectTo: "/dashboard" })
          }}
          className="mt-8"
        >
          <Button type="submit" className="w-full" size="lg">
            LINEでログイン
          </Button>
        </form>
      </div>
    </div>
  )
}
