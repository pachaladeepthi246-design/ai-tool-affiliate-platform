import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import Header from '../components/Header';
import { useBackend } from '../hooks/useBackend';
import { PlusCircle, BarChart, Users, DollarSign, Eye } from 'lucide-react';

export default function AdminDashboard() {
  const backend = useBackend();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Fetch analytics data
  const { data: analytics } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: () => backend.analytics.dashboard(),
  });

  // Create card mutation
  const createCardMutation = useMutation({
    mutationFn: (data: any) => backend.cards.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "Card created successfully!",
      });
    },
    onError: (error) => {
      console.error('Create card error:', error);
      toast({
        title: "Error",
        description: "Failed to create card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCard = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const cardData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      preview_content: formData.get('preview_content') as string,
      full_content: formData.get('full_content') as string,
      images: [formData.get('image_url') as string].filter(Boolean),
      affiliate_url: formData.get('affiliate_url') as string,
      price: parseFloat(formData.get('price') as string) || 0,
      tags: (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean),
      category_id: parseInt(formData.get('category_id') as string) || 1,
      is_premium: formData.get('is_premium') === 'on',
      download_url: formData.get('download_url') as string,
    };

    createCardMutation.mutate(cardData);
  };

  const stats = [
    {
      title: 'Total Clicks',
      value: analytics?.totalClicks || 0,
      icon: Eye,
      description: 'This month',
    },
    {
      title: 'Total Users',
      value: analytics?.totalUsers || 0,
      icon: Users,
      description: 'Registered users',
    },
    {
      title: 'Total Revenue',
      value: `$${analytics?.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      description: 'All time',
    },
    {
      title: 'Total Cashbacks',
      value: `$${analytics?.totalCashbacks?.toFixed(2) || '0.00'}`,
      icon: BarChart,
      description: 'Approved cashbacks',
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your AI tools platform</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Card
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Card</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleCreateCard} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Price ($)</Label>
                    <Input id="price" name="price" type="number" step="0.01" min="0" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" name="description" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="preview_content">Preview Content</Label>
                  <Textarea id="preview_content" name="preview_content" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="full_content">Full Content</Label>
                  <Textarea id="full_content" name="full_content" rows={5} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input id="image_url" name="image_url" type="url" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="affiliate_url">Affiliate URL</Label>
                    <Input id="affiliate_url" name="affiliate_url" type="url" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input id="tags" name="tags" placeholder="ai, tools, productivity" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category_id">Category ID</Label>
                    <Input id="category_id" name="category_id" type="number" defaultValue="1" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="download_url">Download URL</Label>
                  <Input id="download_url" name="download_url" type="url" />
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_premium"
                    name="is_premium"
                    className="rounded"
                  />
                  <Label htmlFor="is_premium">Premium content</Label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCardMutation.isPending}>
                    {createCardMutation.isPending ? 'Creating...' : 'Create Card'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="coupons">Coupons</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <stat.icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Clicks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.recentClicks?.map((click) => (
                      <div key={click.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{click.card_title}</p>
                          <p className="text-sm text-muted-foreground">{click.user_email}</p>
                        </div>
                        <Badge variant="outline">
                          {new Date(click.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Cards</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.topCards?.map((card) => (
                      <div key={card.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{card.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {card.clicks} clicks • ${card.revenue} revenue
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Detailed analytics and reporting features coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  User management features coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="coupons">
            <Card>
              <CardHeader>
                <CardTitle>Coupon Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Coupon management features coming soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
