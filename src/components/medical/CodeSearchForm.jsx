import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import SearchSuggestions from '@/components/ui/search-suggestions';
import { Search, Filter, X } from 'lucide-react';

export default function CodeSearchForm({ onSearch, onFilter, loading = false }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [activeFilters, setActiveFilters] = useState([]);

  const categories = {
    all: 'All Categories',
    infectious: 'Infectious and Parasitic Diseases',
    neoplasms: 'Neoplasms',
    blood: 'Blood and Immune System',
    endocrine: 'Endocrine, Nutritional and Metabolic',
    mental: 'Mental and Behavioral Disorders',
    nervous: 'Nervous System',
    eye: 'Eye and Adnexa',
    ear: 'Ear and Mastoid Process',
    circulatory: 'Circulatory System',
    respiratory: 'Respiratory System',
    digestive: 'Digestive System',
    skin: 'Skin and Subcutaneous Tissue',
    musculoskeletal: 'Musculoskeletal System',
    genitourinary: 'Genitourinary System',
    pregnancy: 'Pregnancy, Childbirth and Puerperium',
    perinatal: 'Perinatal Period',
    congenital: 'Congenital Malformations',
    symptoms: 'Symptoms and Abnormal Findings',
    injury: 'Injury, Poisoning and External Causes',
    external: 'External Causes of Morbidity',
    health: 'Health Services Contact'
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch({
        query: searchQuery,
        category: category !== 'all' ? category : null,
        filters: activeFilters
      });
    }
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = [...activeFilters];
    const existingIndex = newFilters.findIndex(f => f.type === filterType);
    
    if (existingIndex >= 0) {
      if (value) {
        newFilters[existingIndex].value = value;
      } else {
        newFilters.splice(existingIndex, 1);
      }
    } else if (value) {
      newFilters.push({ type: filterType, value });
    }
    
    setActiveFilters(newFilters);
    
    if (onFilter) {
      onFilter(newFilters);
    }
  };

  const removeFilter = (filterToRemove) => {
    const newFilters = activeFilters.filter(f => f !== filterToRemove);
    setActiveFilters(newFilters);
    
    if (onFilter) {
      onFilter(newFilters);
    }
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
    setCategory('all');
    setSearchQuery('');
    
    if (onFilter) {
      onFilter([]);
    }
    
    if (onSearch) {
      onSearch({ query: '', category: null, filters: [] });
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search ICD-10 Codes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <SearchSuggestions
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={(suggestion) => {
                  if (suggestion.type === 'icd10') {
                    setSearchQuery(`${suggestion.code} - ${suggestion.name}`);
                    // Auto-trigger search when ICD code is selected
                    setTimeout(() => {
                      const event = { preventDefault: () => {} };
                      handleSearch(event);
                    }, 100);
                  } else if (suggestion.type === 'condition') {
                    setSearchQuery(suggestion.name);
                    setTimeout(() => {
                      const event = { preventDefault: () => {} };
                      handleSearch(event);
                    }, 100);
                  }
                }}
                placeholder="Search by code, description, or keyword..."
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Filter className="w-4 h-4" />
                Category
              </label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quick Filters</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('severity', 'acute')}
                  className={activeFilters.some(f => f.type === 'severity' && f.value === 'acute') ? 'bg-blue-100' : ''}
                >
                  Acute
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('severity', 'chronic')}
                  className={activeFilters.some(f => f.type === 'severity' && f.value === 'chronic') ? 'bg-blue-100' : ''}
                >
                  Chronic
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('type', 'common')}
                  className={activeFilters.some(f => f.type === 'type' && f.value === 'common') ? 'bg-blue-100' : ''}
                >
                  Common
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Active Filters Display */}
        {(activeFilters.length > 0 || category !== 'all' || searchQuery) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Active Filters:</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: "{searchQuery}"
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setSearchQuery('')}
                  />
                </Badge>
              )}
              {category !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Category: {categories[category]}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setCategory('all')}
                  />
                </Badge>
              )}
              {activeFilters.map((filter, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {filter.type}: {filter.value}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeFilter(filter)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}