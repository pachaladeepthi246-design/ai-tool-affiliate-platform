import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useBackend } from '../hooks/useBackend';
import { BookmarkIcon, Calendar } from 'lucide-react';

export default function UserBookmarks() {
  const backend = useBackend();

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-bookmarks'],
    queryFn: () => backend.users.bookmarks({ limit: 50 }),
  });

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center">
              <BookmarkIcon className="h-8 w-8 mr-3" />
              My Bookmarks
            </h1>
            <p className="text-muted-foreground mt-2">
              {data?.total || 0} saved items
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Failed to load bookmarks. Please try again.</p>
              </CardContent>
            </Card>
          ) : !data?.bookmarks.length ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookmarkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No bookmarks yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start exploring and bookmark your favorite AI tools!
                </p>
                <Button asChild>
                  <Link to="/">Explore AI Tools</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {data.bookmarks.map((bookmark) => (
                <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          {bookmark.images[0] && (
                            <img
                              src={bookmark.images[0]}
                              alt={bookmark.title}
                              className="w-12 h-12 object-cover rounded"
                            />
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">{bookmark.title}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="secondary">{bookmark.category}</Badge>
                              {bookmark.price > 0 && (
                                <Badge variant="default">${bookmark.price}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-muted-foreground line-clamp-2 mb-3">
                          {bookmark.description}
                        </p>
                        
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 mr-1" />
                          Bookmarked on {new Date(bookmark.bookmarked_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <Button asChild>
                          <Link to={`/cards/${bookmark.slug}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
