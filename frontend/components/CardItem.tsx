import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, BookmarkIcon, Eye } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useBackend } from '../hooks/useBackend';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import type { Card as CardType } from '~backend/cards/list';

interface CardItemProps {
  card: CardType;
}

export default function CardItem({ card }: CardItemProps) {
  const { isSignedIn } = useAuth();
  const backend = useBackend();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const likeMutation = useMutation({
    mutationFn: () => backend.cards.like({ cardId: card.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast({
        title: "Success",
        description: "Card liked!",
      });
    },
    onError: (error) => {
      console.error('Like error:', error);
      toast({
        title: "Error",
        description: "Failed to like card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => backend.users.bookmark({ cardId: card.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast({
        title: "Success",
        description: "Card bookmarked!",
      });
    },
    onError: (error) => {
      console.error('Bookmark error:', error);
      toast({
        title: "Error",
        description: "Failed to bookmark card. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like cards.",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: "Please sign in to bookmark cards.",
        variant: "destructive",
      });
      return;
    }
    bookmarkMutation.mutate();
  };

  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg">
      <Link to={`/cards/${card.slug}`}>
        <div className="aspect-video overflow-hidden">
          <img
            src={card.images[0] || '/placeholder.jpg'}
            alt={card.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        </div>
        <CardContent className="p-4">
          <div className="space-y-2">
            <h3 className="font-semibold line-clamp-2">{card.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {card.description}
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{card.category}</Badge>
              {card.is_premium && (
                <Badge variant="default">${card.price}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {card.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-4 pt-0">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span className="flex items-center space-x-1">
              <Eye className="h-4 w-4" />
              <span>{card.views_count}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Heart className="h-4 w-4" />
              <span>{card.likes_count}</span>
            </span>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending}
            >
              <Heart className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBookmark}
              disabled={bookmarkMutation.isPending}
            >
              <BookmarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
