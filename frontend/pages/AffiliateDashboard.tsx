import { useQuery } from '@tanstack/react-query';
import backend from '~backend/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, TrendingUp, MousePointerClick, DollarSign, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function AffiliateDashboard() {
  const { toast } = useToast();

  const { data: linkStats, isLoading: linksLoading } = useQuery({
    queryKey: ['affiliate-links'],
    queryFn: () => backend.affiliates.listLinks({ page: 1, limit: 50 }),
  });

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link copied!',
      description: 'Affiliate link copied to clipboard',
    });
  };

  if (linksLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const totalClicks = linkStats?.links.reduce((sum, link) => sum + link.clicks, 0) || 0;
  const totalConversions = linkStats?.links.reduce((sum, link) => sum + link.conversions, 0) || 0;
  const totalRevenue = linkStats?.links.reduce((sum, link) => sum + link.revenue, 0) || 0;
  const conversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Dashboard</h1>
          <p className="text-muted-foreground">Track your affiliate performance and earnings</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              From {linkStats?.links.length || 0} active links
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              {conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across all campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{linkStats?.links.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Currently tracking
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Affiliate Links</CardTitle>
          <CardDescription>
            Manage and track your affiliate links
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!linkStats?.links.length ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No affiliate links yet</p>
              <p className="text-sm text-muted-foreground">
                Start creating affiliate links for AI tools to earn commissions
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {linkStats.links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{link.name || 'Untitled Link'}</h3>
                      <Badge variant={link.is_active ? 'default' : 'secondary'}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono truncate max-w-md">
                      {link.tracking_url}
                    </p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MousePointerClick className="h-3 w-3" />
                        {link.clicks} clicks
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {link.conversions} conversions
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${link.revenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyLink(link.tracking_url)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
