import { getTenants } from "@/lib/actions/tenants"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CreateTenantDialog } from "@/components/tenants/create-tenant-dialog"
import { Users } from "lucide-react"
import Link from "next/link"

export default async function TenantsPage() {
  const tenants = await getTenants()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">グループ</h1>
          <p className="text-muted-foreground">
            参加しているグループの管理
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      {tenants.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>グループがありません</CardTitle>
            <CardDescription>
              新しいグループを作成して、割り勘の管理を始めましょう。
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Link
              key={tenant.id}
              href={`/dashboard/tenants/${tenant.id}`}
              className="block"
            >
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                      {tenant.description && (
                        <CardDescription className="line-clamp-2">
                          {tenant.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="capitalize">{tenant.memberRole}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
