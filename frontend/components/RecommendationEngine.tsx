import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, Heart, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CardItem from './CardItem';
import backend from '~backend/client';

export default function RecommendationEngine() {
  const { data: personalizedData, isLoading: loadingPersonalized } = useQuery({
    queryKey: ['recommendations', 'personalized'],
    queryFn: () => backend.recommendations.getRecommendations({ 
      type: 'personalized', 
      limit: 8 
    }),
  });

  const { data: trendingData, isLoading: loadingTrending } = useQuery({
    queryKey: ['recommendations', 'trending'],
    queryFn: () => backend.recommendations.getRecommendations({ 
      type: 'trending', 
      limit: 8 
    }),
  });

  const { data: similarData, isLoading: loadingSimilar } = useQuery({
    queryKey: ['recommendations', 'similar'],
    queryFn: () => backend.recommendations.getRecommendations({ 
      type: 'similar', 
      limit: 8 
    }),
  });

  const { data: categoryData, isLoading: loadingCategory } = useQuery({
    queryKey: ['recommendations', 'category_based'],
    queryFn: () => backend.recommendations.getRecommendations({ 
      type: 'category_based', 
      limit: 8 
    }),
  });

  const personalizedRecs = personalizedData?.recommendations || [];
  const trendingRecs = trendingData?.recommendations || [];
  const similarRecs = similarData?.recommendations || [];
  const categoryRecs = categoryData?.recommendations || [];

  const RecommendationSection = ({ 
    title, 
    description, 
    icon: Icon, 
    recommendations, 
    loading 
  }: {
    title: string;
    description: string;
    icon: any;
    recommendations: any[];
    loading: boolean;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-video bg-muted"></div>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : recommendations?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(recommendations || []).map((card) => (
            <div key={card.id} className="relative">
              <CardItem card={card} />
              {card.recommendationReason && (
                <Badge 
                  variant="secondary" 
                  className="absolute top-2 right-2 text-xs bg-primary/10 text-primary"
                >
                  {card.recommendationReason}
                </Badge>
              )}
              {card.recommendationScore && (
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className="text-xs">
                    <Star className="h-3 w-3 mr-1" />
                    {Math.round(card.recommendationScore)}%
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recommendations available yet.</p>
              <p className="text-sm mt-2">
                Interact with more content to get personalized recommendations!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Recommended for You</h2>
        <p className="text-muted-foreground">
          Discover AI tools and templates tailored to your interests
        </p>
      </div>

      <Tabs defaultValue="personalized" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personalized" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">For You</span>
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Trending</span>
          </TabsTrigger>
          <TabsTrigger value="similar" className="flex items-center space-x-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Similar</span>
          </TabsTrigger>
          <TabsTrigger value="category" className="flex items-center space-x-2">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalized" className="mt-6">
          <RecommendationSection
            title="Personalized Recommendations"
            description="Based on your preferences and activity"
            icon={Sparkles}
            recommendations={personalizedRecs || []}
            loading={loadingPersonalized}
          />
        </TabsContent>

        <TabsContent value="trending" className="mt-6">
          <RecommendationSection
            title="Trending Now"
            description="Popular content that's gaining traction"
            icon={TrendingUp}
            recommendations={trendingRecs || []}
            loading={loadingTrending}
          />
        </TabsContent>

        <TabsContent value="similar" className="mt-6">
          <RecommendationSection
            title="Similar to Your Likes"
            description="More content like what you've enjoyed"
            icon={Heart}
            recommendations={similarRecs || []}
            loading={loadingSimilar}
          />
        </TabsContent>

        <TabsContent value="category" className="mt-6">
          <RecommendationSection
            title="From Your Favorite Categories"
            description="Popular items in categories you love"
            icon={Star}
            recommendations={categoryRecs || []}
            loading={loadingCategory}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}