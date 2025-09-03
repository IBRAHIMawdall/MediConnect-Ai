import React, { useState } from "react";
import { InvokeLLM } from "@/integrations/Core";
import { ICD10Code, Drug } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SearchSuggestions from "@/components/ui/search-suggestions";
import { 
  Brain, 
  Search, 
  ArrowRight, 
  Loader2, 
  Plus, 
  AlertCircle,
  Lightbulb,
  Stethoscope,
  Pill
} from "lucide-react";

export default function AIMapper() {
  const [activeTab, setActiveTab] = useState("icd-to-drug");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const searchICDToDrug = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await InvokeLLM({
        prompt: `You are a medical AI assistant. Given the ICD-10 code or condition description "${query}", provide:
        1. The exact ICD-10 code (if not provided)
        2. Full condition name
        3. Medical specialty
        4. Common medications used to treat this condition
        5. Therapeutic rationale for each medication

        Respond with detailed, clinically accurate information. Focus on first-line treatments and evidence-based therapies.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            icd_code: { type: "string" },
            condition_name: { type: "string" },
            specialty: { type: "string" },
            medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  generic_name: { type: "string" },
                  brand_names: { type: "array", items: { type: "string" } },
                  drug_class: { type: "string" },
                  rationale: { type: "string" },
                  dosage_info: { type: "string" }
                }
              }
            },
            clinical_notes: { type: "string" }
          }
        }
      });

      setResults({
        type: "icd-to-drug",
        data: response
      });

    } catch (err) {
      setError("Failed to get AI suggestions. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const searchDrugToICD = async () => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setError("");
    setResults(null);

    try {
      const response = await InvokeLLM({
        prompt: `You are a medical AI assistant. Given the medication "${query}", provide:
        1. Generic and common brand names
        2. Drug classification and mechanism of action
        3. Primary indications (conditions it treats)
        4. Associated ICD-10 codes for each indication
        5. Clinical context and usage patterns

        Provide comprehensive, evidence-based medical information.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            generic_name: { type: "string" },
            brand_names: { type: "array", items: { type: "string" } },
            drug_class: { type: "string" },
            mechanism_of_action: { type: "string" },
            indications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  condition: { type: "string" },
                  icd_codes: { type: "array", items: { type: "string" } },
                  specialty: { type: "string" },
                  usage_notes: { type: "string" }
                }
              }
            },
            contraindications: { type: "string" },
            clinical_notes: { type: "string" }
          }
        }
      });

      setResults({
        type: "drug-to-icd",
        data: response
      });

    } catch (err) {
      setError("Failed to get AI suggestions. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToDatabase = async (type, item) => {
    try {
      if (type === "icd") {
        await ICD10Code.create({
          code: item.icd_code || item.code,
          title: item.condition_name || item.condition,
          specialty: item.specialty,
          category: item.specialty,
          keywords: [item.condition_name || item.condition],
          commonly_prescribed_drugs: item.medications?.map(m => m.generic_name) || []
        });
      } else if (type === "drug") {
        await Drug.create({
          generic_name: item.generic_name,
          brand_names: item.brand_names || [],
          drug_class: item.drug_class,
          mechanism_of_action: item.mechanism_of_action,
          indications: item.indications?.map(i => i.condition) || [],
          icd10_codes: item.indications?.flatMap(i => i.icd_codes) || []
        });
      }
      alert(`Successfully saved to database!`);
    } catch (err) {
      alert(`Error saving to database: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Brain className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold text-slate-800">AI Medical Mapper</h1>
        </div>
        <p className="text-slate-600">Intelligent mapping between ICD-10 codes and medications using AI</p>
      </div>

      {/* Main Interface */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="icd-to-drug" className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4" />
                Condition → Drugs
              </TabsTrigger>
              <TabsTrigger value="drug-to-icd" className="flex items-center gap-2">
                <Pill className="w-4 h-4" />
                Drug → Conditions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="icd-to-drug" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Find Medications for a Condition</h3>
                  <p className="text-sm text-slate-600 mb-4">Enter an ICD-10 code (e.g., E11.9) or condition name (e.g., "Type 2 Diabetes")</p>
                  <div className="flex gap-3">
                    <SearchSuggestions
                      placeholder="E11.9 or Type 2 Diabetes Mellitus"
                      value={query}
                      onChange={setQuery}
                      onSelect={(suggestion) => {
                        if (suggestion.type === 'icd10' || suggestion.type === 'condition') {
                          const searchValue = suggestion.type === 'icd10' 
                            ? `${suggestion.code} - ${suggestion.name}`
                            : suggestion.name;
                          setQuery(searchValue);
                          setTimeout(() => searchICDToDrug(), 100);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={searchICDToDrug}
                      disabled={isLoading || !query.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="drug-to-icd" className="mt-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Find Conditions for a Medication</h3>
                  <p className="text-sm text-slate-600 mb-4">Enter a generic or brand name medication (e.g., "Metformin" or "Glucophage")</p>
                  <div className="flex gap-3">
                    <SearchSuggestions
                      placeholder="Metformin or Glucophage"
                      value={query}
                      onChange={setQuery}
                      onSelect={(suggestion) => {
                        if (suggestion.type === 'drug') {
                          setQuery(suggestion.name);
                          setTimeout(() => searchDrugToICD(), 100);
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={searchDrugToICD}
                      disabled={isLoading || !query.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-4">
              <h4 className="font-semibold text-slate-800">AI Mapping Results:</h4>
              <div className="grid gap-4">
                {results.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-slate-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h5 className="font-medium text-slate-800">{item.name}</h5>
                        <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                        {item.confidence && (
                          <Badge variant="outline" className="mt-2">
                            Confidence: {item.confidence}%
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => saveToDatabase(activeTab === 'icd-to-drug' ? 'drug' : 'icd', item)}
                        className="ml-4"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}