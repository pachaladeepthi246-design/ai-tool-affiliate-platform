import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBackend } from '../hooks/useBackend';
import CardItem from './CardItem';
import { Skeleton } from '@/components/ui/skeleton';

interface CardGridProps {
  searchQuery?: string;
  category?: string;
}

export default function CardGrid({ searchQuery, category }: CardGridProps) {
  const backend = useBackend();

  const { data, isLoading, error } = useQuery({
    queryKey: ['cards', searchQuery, category],
    queryFn: () => backend.cards.list({
      search: searchQuery,
      category: category,
      limit: 20,
    }),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Failed to load cards. Please try again.</p>
      </div>
    );
  }

  if (!data?.cards.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No cards found.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {data.cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  );
}
