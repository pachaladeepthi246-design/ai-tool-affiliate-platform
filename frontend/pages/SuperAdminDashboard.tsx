import React from 'react';
import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, DollarSign, TrendingUp, Database, AlertCircle, MessageSquare } from 'lucide-react';

export default function SuperAdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => backend.admin.getDashboardStats(),
  });

  const { data: backups } = useQuery({
    queryKey: ['backups'],
    queryFn: () => backend.operations.listBackups(),
  });

  const { data: errorLogs } = useQuery({
    queryKey: ['error-logs'],
    queryFn: () => backend.security.getRecentErrors(),
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.revenue.totalRevenue.toFixed(2) ?? '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats?.revenue.monthRevenue.toFixed(2) ?? '0.00'} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.users.activeUsers ?? 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.affiliates.conversionRate.toFixed(2) ?? '0.00'}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.affiliates.totalConversions ?? 0} conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              Last backup: {backups?.backups[0]?.completed_at ? new Date(backups.backups[0].completed_at).toLocaleString() : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="content">Content Moderation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Users by Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.users.usersByRole.map(role => (
                  <div key={role.role} className="flex justify-between items-center">
                    <span className="capitalize">{role.role}</span>
                    <span className="font-bold">{role.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span>Total Cards</span>
                  <span className="font-bold">{stats?.content.totalCards ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Published</span>
                  <span className="font-bold text-green-600">{stats?.content.publishedCards ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Pending Review</span>
                  <span className="font-bold text-yellow-600">{stats?.content.pendingCards ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.content.topCards.slice(0, 5).map((card, index) => (
                  <div key={card.id} className="flex justify-between items-center border-b pb-2">
                    <div>
                      <div className="font-medium">#{index + 1} {card.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {card.views} views • {card.likes} likes
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">${card.revenue.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Recent Backups
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {backups?.backups.slice(0, 5).map(backup => (
                    <div key={backup.id} className="flex justify-between items-center text-sm">
                      <span className="capitalize">{backup.backup_type}</span>
                      <span className={backup.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                        {backup.status}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {errorLogs?.errors.slice(0, 5).map((error: any) => (
                    <div key={error.id} className="text-sm border-b pb-2">
                      <div className="font-medium truncate">{error.error_type}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(error.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
