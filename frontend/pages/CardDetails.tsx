import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Header from '../components/Header';
import { useBackend } from '../hooks/useBackend';
import { Eye, Heart, Download, ExternalLink } from 'lucide-react';

export default function CardDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const backend = useBackend();

  const { data: card, isLoading, error } = useQuery({
    queryKey: ['card', slug],
    queryFn: () => backend.cards.get({ slug: slug! }),
    enabled: !!slug,
  });

  const handlePurchase = () => {
    if (!isSignedIn) {
      navigate('/auth');
      return;
    }
    navigate(`/checkout?cardId=${card?.id}`);
  };

  const handleAffiliateClick = () => {
    if (card?.affiliate_url) {
      // Track click for analytics
      backend.analytics.trackClick({
        cardId: card.id,
        affiliateId: 1, // You would get this from the card data
      });
      window.open(card.affiliate_url, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Card not found</h1>
          <Button onClick={() => navigate('/')}>Go back home</Button>
        </div>
      </div>
    );
  }

  const showFullContent = !card.is_premium || isSignedIn;

  return (
    <div className="min-h-screen">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="secondary">{card.category}</Badge>
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
            </div>
            
            <h1 className="text-4xl font-bold mb-4">{card.title}</h1>
            <p className="text-xl text-muted-foreground mb-6">{card.description}</p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {card.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Images */}
              {card.images.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {card.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`${card.title} - ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Content */}
              <Card>
                <CardContent className="p-6">
                  {showFullContent ? (
                    <div className="prose max-w-none">
                      <h3 className="text-lg font-semibold mb-4">Full Content</h3>
                      <div className="whitespace-pre-wrap">
                        {card.full_content || card.preview_content}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Preview</h3>
                      <div className="p-4 bg-muted rounded-lg">
                        <p>{card.preview_content}</p>
                      </div>
                      <div className="text-center p-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
                        <h4 className="text-lg font-semibold mb-2">Premium Content</h4>
                        <p className="text-muted-foreground mb-4">
                          Subscribe or purchase to view the full content
                        </p>
                        <Button onClick={handlePurchase}>
                          Unlock Content - ${card.price}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Purchase Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {card.is_premium && (
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary mb-2">
                          ${card.price}
                        </div>
                        <p className="text-sm text-muted-foreground">One-time purchase</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      {card.is_premium && (
                        <Button onClick={handlePurchase} className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          Purchase & Download
                        </Button>
                      )}

                      {card.affiliate_url && (
                        <Button variant="outline" onClick={handleAffiliateClick} className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Official Site
                        </Button>
                      )}

                      {card.download_url && showFullContent && (
                        <Button variant="outline" className="w-full" asChild>
                          <a href={card.download_url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download Files
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card>
                <CardContent className="p-6">
                  <h4 className="font-semibold mb-4">What's Included</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Full tutorial content
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Downloadable resources
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Step-by-step guides
                    </li>
                    <li className="flex items-center">
                      <div className="w-2 h-2 bg-primary rounded-full mr-3" />
                      Lifetime access
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
