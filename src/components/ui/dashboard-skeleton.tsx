import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Main Content - Left Column */}
      <div className="xl:col-span-3 space-y-6">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Valor Líquido Card Skeleton */}
          <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20 bg-purple-400" />
              <Skeleton className="h-5 w-5 rounded bg-purple-400" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 bg-purple-400" />
            </CardContent>
          </Card>

          {/* Vendas Card Skeleton */}
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>

          {/* Reembolso Card Skeleton */}
          <Card className="bg-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-5 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        </div>

        {/* Chart Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-6 w-48" />
            </div>
            <div className="flex gap-4 mt-4">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Skeleton className="h-full w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions Skeleton */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-8 w-48" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3"><Skeleton className="h-4 w-12" /></th>
                    <th className="pb-3"><Skeleton className="h-4 w-16" /></th>
                    <th className="pb-3"><Skeleton className="h-4 w-14" /></th>
                    <th className="pb-3"><Skeleton className="h-4 w-12" /></th>
                    <th className="pb-3 text-right"><Skeleton className="h-4 w-20 ml-auto" /></th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-3"><Skeleton className="h-6 w-16 rounded-full" /></td>
                      <td className="py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar Skeleton */}
      <div className="space-y-6">
        {/* Saldo Disponível Skeleton */}
        <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white border-0 shadow-lg">
          <CardHeader>
            <Skeleton className="h-5 w-32 bg-purple-400" />
            <Skeleton className="h-4 w-40 bg-purple-400" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-32 bg-purple-400 mb-4" />
            <Skeleton className="h-10 w-full bg-white/20 rounded" />
          </CardContent>
        </Card>

        {/* Saldo Pendente Skeleton */}
        <Card className="bg-gradient-to-br from-orange-500 to-orange-700 text-white border-0 shadow-lg">
          <CardHeader>
            <Skeleton className="h-5 w-28 bg-orange-400" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-32 bg-orange-400" />
          </CardContent>
        </Card>

        {/* Central Financeira Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>

        {/* Ações Rápidas Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full bg-purple-200" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};