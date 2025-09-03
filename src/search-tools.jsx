import React, { useState } from "react";
import { ICD10Code, Drug } from "@/entities/all";
import { InvokeLLM } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SearchSuggestions from "@/components/ui/search-suggestions";
import { 
  Search, 
  Database, 
  Zap, 
  FileText,
  Pill,
  Loader2,
  AlertCircle,
  Filter,
  TrendingUp
} from "lucide-react";

export default function SearchTools() {
  const [activeTab, setActiveTab] = useState("advanced-search");
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Advanced Search States
  const [advancedQuery, setAdvancedQuery] = useState("");
  const [searchType, setSearchType] = useState("both");

  // AI Search States
  const [aiQuery, setAiQuery] = useState("");
  const [aiResults, setAiResults] = useState(null);

  // Analytics States
  const [analytics, setAnalytics] = useState(null);

  const performAdvancedSearch = async () => {
    if (!advancedQuery.trim()) return;
    
    setIsLoading(true);
    setError("");
    setSearchResults(null);

    try {
      const promises = [];
      
      if (searchType === "icd" || searchType === "both") {
        promises.push(ICD10Code.list().then(codes => ({
          type: "icd",
          results: codes.filter(code => 
            code.code?.toLowerCase().includes(advancedQuery.toLowerCase()) ||
            code.title?.toLowerCase().includes(advancedQuery.toLowerCase()) ||
            code.category?.toLowerCase().includes(advancedQuery.toLowerCase()) ||
            code.specialty?.toLowerCase().includes(advancedQuery.toLowerCase()) ||
            code.keywords?.some(k => k.toLowerCase().includes(advancedQuery.toLowerCase()))
          )
        })));
      }

      if (searchType === "drug" || searchType === "both") {
        promises.push(Drug.list().then(drugs => ({
          type: "drug",
          results: drugs.filter(drug => 
            drug.generic_name?.toLowerCase().includes(advancedQuery.toLowerCase()) ||
            drug.brand_names?.some(brand => brand.toLowerCase().includes(advancedQuery.toLowerCase())) ||
            drug.drug_class?.toLowerCase().includes(advancedQuery.toLowerCase()) ||
            drug.indications?.some(indication => indication.toLowerCase().includes(advancedQuery.toLowerCase()))
          )
        })));
      }

      const results = await Promise.all(promises);
      setSearchResults(results);

    } catch (err) {
      setError("Search failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const performAISearch = async () => {
    if (!aiQuery.trim()) return;
    
    setIsLoading(true);
    setError("");
    setAiResults(null);

    try {
      const response = await InvokeLLM({
        prompt: `You are a medical search assistant. For the query "${aiQuery}", provide:
        1. Relevant ICD-10 codes and conditions
        2. Related medications
        3. Medical specialties involved
        4. Clinical context and relationships
        5. Additional search suggestions
        
        Be comprehensive and clinically accurate in your response.`,
        response_json_schema: {
          type: "object",
          properties: {
            relevant_icd_codes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  condition: { type: "string" },
                  relevance_score: { type: "number" }
                }
              }
            },
            related_medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  generic_name: { type: "string" },
                  brand_names: { type: "array", items: { type: "string" } },
                  relevance_reason: { type: "string" }
                }
              }
            },
            specialties: { type: "array", items: { type: "string" } },
            clinical_context: { type: "string" },
            search_suggestions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiResults(response);

    } catch (err) {
      setError("AI search failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAnalytics = async () => {
    setIsLoading(true);
    setError("");
    setAnalytics(null);

    try {
      const [icdCodes, drugs] = await Promise.all([
        ICD10Code.list(),
        Drug.list()
      ]);

      // Ensure we have arrays before processing
      const safeIcdCodes = Array.isArray(icdCodes) ? icdCodes : [];
      const safeDrugs = Array.isArray(drugs) ? drugs : [];

      // Generate analytics
      const categoryCount = {};
      const specialtyCount = {};
      const drugClassCount = {};

      safeIcdCodes.forEach(code => {
        if (code) { // Ensure code object itself is not null/undefined
          if (code.category) categoryCount[code.category] = (categoryCount[code.category] || 0) + 1;
          if (code.specialty) specialtyCount[code.specialty] = (specialtyCount[code.specialty] || 0) + 1;
        }
      });

      safeDrugs.forEach(drug => {
        if (drug && drug.drug_class) { // Ensure drug object and its drug_class property exist
          drugClassCount[drug.drug_class] = (drugClassCount[drug.drug_class] || 0) + 1;
        }
      });

      setAnalytics({
        totalICD10: safeIcdCodes.length,
        totalDrugs: safeDrugs.length,
        topCategories: Object.entries(categoryCount).sort(([,a], [,b]) => b - a).slice(0, 5),
        topSpecialties: Object.entries(specialtyCount).sort(([,a], [,b]) => b - a).slice(0, 5),
        topDrugClasses: Object.entries(drugClassCount).sort(([,a], [,b]) => b - a).slice(0, 5)
      });

    } catch (err) {
      setError("Analytics generation failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Search className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-800">Advanced Search Tools</h1>
        </div>
        <p className="text-slate-600">Powerful search, AI assistance, and database analytics</p>
      </div>

      {/* Main Interface */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Advanced Search Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="advanced-search" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Advanced Search
              </TabsTrigger>
              <TabsTrigger value="ai-search" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                AI Search
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="advanced-search" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Multi-Database Search</h3>
                  <p className="text-sm text-slate-600 mb-4">Search across ICD-10 codes and drug database simultaneously</p>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <SearchSuggestions
                        placeholder="Enter search terms (codes, conditions, medications, etc.)"
                        value={advancedQuery}
                        onChange={setAdvancedQuery}
                        onSelect={(suggestion) => {
                          const searchValue = suggestion.type === 'icd10' 
                            ? `${suggestion.code} - ${suggestion.name}`
                            : suggestion.name;
                          setAdvancedQuery(searchValue);
                          setTimeout(() => performAdvancedSearch(), 100);
                        }}
                        className="flex-1"
                      />
                      <Button 
                        onClick={performAdvancedSearch}
                        disabled={isLoading || !advancedQuery.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        Search
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults && (
                  <div className="mt-6">
                    <h4 className="text-md font-semibold mb-3">Search Results</h4>
                    <div className="space-y-2">
                      {searchResults.map((result, index) => (
                        <div key={index} className="p-3 bg-slate-50 rounded border">
                          <Badge variant="outline" className="mb-2">{result.type}</Badge>
                          <p className="font-medium">{result.name}</p>
                          <p className="text-sm text-slate-600">{result.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

              <TabsContent value="ai-search" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">AI-Powered Search</h3>
                    <p className="text-sm text-slate-600 mb-4">Natural language queries with intelligent results</p>
                    
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Ask anything about medical conditions, treatments, or drug interactions..."
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        className="min-h-[100px]"
                      />
                      <Button 
                        onClick={performAISearch}
                        disabled={isLoading || !aiQuery.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        AI Search
                      </Button>
                    </div>
                  </div>

                  {aiResults && (
                    <div className="mt-6">
                      <h4 className="text-md font-semibold mb-3">AI Results</h4>
                      <div className="p-4 bg-purple-50 rounded border">
                        <p className="text-sm">{aiResults.response}</p>
                        {aiResults.suggestions && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Related Suggestions:</p>
                            <div className="flex flex-wrap gap-2">
                              {aiResults.suggestions.map((suggestion, index) => (
                                <Badge key={index} variant="secondary">{suggestion}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Database Analytics</h3>
                    <p className="text-sm text-slate-600 mb-4">Generate insights and statistics from the medical database</p>
                    
                    <Button 
                      onClick={generateAnalytics}
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                      Generate Analytics
                    </Button>
                  </div>

                  {analytics && (
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded border">
                        <h5 className="font-semibold mb-2">Database Statistics</h5>
                        <div className="space-y-1 text-sm">
                          <p>Total ICD-10 Codes: {analytics.totalCodes}</p>
                          <p>Total Drugs: {analytics.totalDrugs}</p>
                          <p>Most Common Category: {analytics.commonCategory}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded border">
                        <h5 className="font-semibold mb-2">Usage Insights</h5>
                        <div className="space-y-1 text-sm">
                          <p>Recent Searches: {analytics.recentSearches}</p>
                          <p>Popular Terms: {analytics.popularTerms?.join(', ')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }