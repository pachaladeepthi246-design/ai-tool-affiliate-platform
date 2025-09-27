import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import backend from '~backend/client';

interface SearchFilters {
  query: string;
  categories: string[];
  tags: string[];
  priceRange: [number, number];
  isPremium?: boolean;
  sortBy: string;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  loading?: boolean;
}

export default function AdvancedSearch({ onSearch, loading }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    categories: [],
    tags: [],
    priceRange: [0, 100],
    sortBy: 'relevance'
  });

  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: searchData } = useQuery({
    queryKey: ['search', 'advanced', filters],
    queryFn: () => backend.search.advancedSearch({
      query: filters.query || undefined,
      categories: filters.categories.length > 0 ? filters.categories : undefined,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
      priceMin: filters.priceRange[0],
      priceMax: filters.priceRange[1],
      isPremium: filters.isPremium,
      sortBy: filters.sortBy as any,
      page: 1,
      limit: 20
    }),
    enabled: false
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ['search', 'suggestions', filters.query],
    queryFn: () => backend.search.getSuggestions({ query: filters.query }),
    enabled: filters.query.length >= 2,
  });

  React.useEffect(() => {
    if (suggestionsData?.suggestions) {
      setSuggestions(suggestionsData.suggestions);
      setShowSuggestions(true);
    }
  }, [suggestionsData]);

  const handleSearch = () => {
    onSearch(filters);
    setShowSuggestions(false);
  };

  const handleQueryChange = (value: string) => {
    setFilters(prev => ({ ...prev, query: value }));
  };

  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.type === 'category') {
      setFilters(prev => ({
        ...prev,
        categories: [...prev.categories, suggestion.value]
      }));
    } else if (suggestion.type === 'tag') {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, suggestion.value]
      }));
    } else {
      setFilters(prev => ({ ...prev, query: suggestion.value }));
    }
    setShowSuggestions(false);
    handleSearch();
  };

  const removeFilter = (type: string, value: string) => {
    if (type === 'category') {
      setFilters(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c !== value)
      }));
    } else if (type === 'tag') {
      setFilters(prev => ({
        ...prev,
        tags: prev.tags.filter(t => t !== value)
      }));
    }
  };

  const activeFiltersCount = 
    filters.categories.length + 
    filters.tags.length + 
    (filters.isPremium !== undefined ? 1 : 0) +
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 100 ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search for AI tools, templates, and more..."
              value={filters.query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="pl-10"
              onFocus={() => setShowSuggestions(suggestions.length > 0)}
            />
            
            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <Card className="absolute top-full mt-1 w-full z-50 border shadow-lg">
                <CardContent className="p-0">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{suggestion.label}</span>
                        {suggestion.count && (
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          
          <Button onClick={handleSearch} disabled={loading}>
            Search
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.categories.map(category => (
            <Badge key={category} variant="secondary" className="flex items-center space-x-1">
              <span>Category: {category}</span>
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('category', category)}
              />
            </Badge>
          ))}
          {filters.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
              <span>Tag: {tag}</span>
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('tag', tag)}
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent>
          <Card>
            <CardContent className="p-4 space-y-6">
              {/* Sort Options */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select 
                  value={filters.sortBy} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="price_low">Price: Low to High</SelectItem>
                    <SelectItem value="price_high">Price: High to Low</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Price Range: ${filters.priceRange[0]} - ${filters.priceRange[1]}
                </label>
                <Slider
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters(prev => ({ 
                    ...prev, 
                    priceRange: value as [number, number] 
                  }))}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Premium Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Content Type</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.isPremium === true}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ 
                          ...prev, 
                          isPremium: checked ? true : undefined 
                        }))
                      }
                    />
                    <label className="text-sm">Premium only</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={filters.isPremium === false}
                      onCheckedChange={(checked) => 
                        setFilters(prev => ({ 
                          ...prev, 
                          isPremium: checked ? false : undefined 
                        }))
                      }
                    />
                    <label className="text-sm">Free only</label>
                  </div>
                </div>
              </div>

              {/* Facets from search results */}
              {searchData?.facets && (
                <>
                  {/* Categories Facet */}
                  {searchData.facets.categories.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Categories</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {searchData.facets.categories.map(facet => (
                          <div key={facet.name} className="flex items-center space-x-2">
                            <Checkbox
                              checked={filters.categories.includes(facet.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    categories: [...prev.categories, facet.name] 
                                  }));
                                } else {
                                  removeFilter('category', facet.name);
                                }
                              }}
                            />
                            <label className="text-sm flex-1">{facet.name}</label>
                            <Badge variant="outline" className="text-xs">
                              {facet.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tags Facet */}
                  {searchData.facets.tags.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tags</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {searchData.facets.tags.slice(0, 10).map(facet => (
                          <div key={facet.name} className="flex items-center space-x-2">
                            <Checkbox
                              checked={filters.tags.includes(facet.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFilters(prev => ({ 
                                    ...prev, 
                                    tags: [...prev.tags, facet.name] 
                                  }));
                                } else {
                                  removeFilter('tag', facet.name);
                                }
                              }}
                            />
                            <label className="text-sm flex-1">{facet.name}</label>
                            <Badge variant="outline" className="text-xs">
                              {facet.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}