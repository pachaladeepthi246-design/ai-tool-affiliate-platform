import React from 'react';
import { useAuth } from '../hooks/useBackend';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Header from '../components/Header';
import { useBackend } from '../hooks/useBackend';
import { Wallet, BookmarkIcon, Download, Star } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const backend = useBackend();

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => backend.users.profile(),
    enabled: !!user,
  });

  const { data: bookmarks } = useQuery({
    queryKey: ['user-bookmarks'],
    queryFn: () => backend.users.bookmarks({ limit: 5 }),
    enabled: !!user,
  });

  const stats = [
    {
      title: 'Wallet Balance',
      value: `$${profile?.wallet_balance?.toFixed(2) || '0.00'}`,
      icon: Wallet,
      description: 'Available cashback',
    },
    {
      title: 'Bookmarks',
      value: bookmarks?.total || 0,
      icon: BookmarkIcon,
      description: 'Saved items',
    },
    {
      title: 'Downloads',
      value: '0',
      icon: Download,
      description: 'This month',
    },
    {
      title: 'Member Since',
      value: profile?.created_at ? new Date(profile.created_at).getFullYear() : 2024,
      icon: Star,
      description: 'Subscription status',
    },
  ];

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.email}!</h1>
          <p className="text-muted-foreground">
            Here's what's happening with your account today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Recent Bookmarks */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookmarks</CardTitle>
          </CardHeader>
          <CardContent>
            {bookmarks?.bookmarks.length ? (
              <div className="space-y-4">
                {bookmarks.bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h4 className="font-medium">{bookmark.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {bookmark.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{bookmark.category}</Badge>
                        {bookmark.price > 0 && (
                          <Badge variant="default">${bookmark.price}</Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookmarkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
                <p className="text-muted-foreground">
                  Start exploring and bookmark your favorite AI tools!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}