import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import AdvancedSearch from '../components/AdvancedSearch';
import CardGrid from '../components/CardGrid';
import RecommendationEngine from '../components/RecommendationEngine';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import backend from '~backend/client';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchFilters, setSearchFilters] = useState({
    query: searchParams.get('q') || '',
    categories: [],
    tags: [],
    priceRange: [0, 100] as [number, number],
    sortBy: 'relevance'
  });
  const [currentPage, setCurrentPage] = useState(1);

  const { data: searchResults, isLoading, error } = useQuery({
    queryKey: ['search', 'advanced', searchFilters, currentPage],
    queryFn: () => backend.search.advancedSearch({
      query: searchFilters.query || undefined,
      categories: searchFilters.categories.length > 0 ? searchFilters.categories : undefined,
      tags: searchFilters.tags.length > 0 ? searchFilters.tags : undefined,
      priceMin: searchFilters.priceRange[0],
      priceMax: searchFilters.priceRange[1],
      sortBy: searchFilters.sortBy as any,
      page: currentPage,
      limit: 20
    }),
    enabled: !!(searchFilters.query || searchFilters.categories.length || searchFilters.tags.length)
  });

  const { data: popularSearches } = useQuery({
    queryKey: ['search', 'popular'],
    queryFn: () => backend.search.getPopularSearches(),
  });

  const handleSearch = (filters: any) => {
    setSearchFilters(filters);
    setCurrentPage(1);
    
    // Update URL params
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showResults = searchFilters.query || searchFilters.categories.length || searchFilters.tags.length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <AdvancedSearch onSearch={handleSearch} loading={isLoading} />
      </div>

      {/* Popular Searches */}
      {!showResults && popularSearches && (
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Popular Searches</h3>
              <div className="flex flex-wrap gap-2">
                {popularSearches.searches.map((search) => (
                  <Badge
                    key={search}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                    onClick={() => handleSearch({ ...searchFilters, query: search })}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Searching...</p>
            </div>
          ) : error ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-destructive">An error occurred while searching. Please try again.</p>
              </CardContent>
            </Card>
          ) : searchResults ? (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Search Results</h2>
                  <p className="text-muted-foreground">
                    Found {searchResults.total} results
                    {searchFilters.query && ` for "${searchFilters.query}"`}
                  </p>
                </div>
                
                {/* Results metadata */}
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {searchResults.totalPages}
                </div>
              </div>

              {/* Search Results Grid */}
              {searchResults.results.length > 0 ? (
                <>
                  <CardGrid cards={searchResults.results} />

                  {/* Pagination */}
                  {searchResults.totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Previous
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, searchResults.totalPages) }, (_, i) => {
                          const page = i + 1;
                          const actualPage = currentPage <= 3 
                            ? page 
                            : currentPage >= searchResults.totalPages - 2
                            ? searchResults.totalPages - 4 + i
                            : currentPage - 2 + i;
                          
                          if (actualPage < 1 || actualPage > searchResults.totalPages) return null;
                          
                          return (
                            <Button
                              key={actualPage}
                              variant={currentPage === actualPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(actualPage)}
                            >
                              {actualPage}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === searchResults.totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="text-muted-foreground">
                      <p className="text-lg font-medium">No results found</p>
                      <p className="mt-2">
                        Try adjusting your search terms or filters to find what you're looking for.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Recommendations when no search */}
      {!showResults && (
        <RecommendationEngine />
      )}
    </div>
  );
}