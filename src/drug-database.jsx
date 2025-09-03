
import React, { useState, useEffect } from "react";
import { Drug } from "./entities/all";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Plus, Pill, Edit, Search, Filter } from "lucide-react";
import { Skeleton } from "./components/ui/skeleton";
import SearchSuggestions from "./components/ui/search-suggestions";

import AddDrugForm from "./components/medical/AddDrugForm";

export default function DrugDatabase() {
  const [drugs, setDrugs] = useState([]);
  const [filteredDrugs, setFilteredDrugs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDrug, setEditingDrug] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("all");

  useEffect(() => {
    loadDrugs();
  }, []);

  const loadDrugs = async () => {
    try {
      setIsLoading(true);
      const data = await Drug.list("-created_date", 100);
      const safeDrugs = Array.isArray(data) ? data : [];
      setDrugs(safeDrugs);
      setFilteredDrugs(safeDrugs);
    } catch (error) {
      console.error("Error loading drugs:", error);
      setDrugs([]);
      setFilteredDrugs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      setFilteredDrugs(drugs);
      return;
    }

    const safeDrugs = Array.isArray(drugs) ? drugs : [];
    const filtered = safeDrugs.filter(drug => {
      if (!drug) return false;
      
      return drug.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(drug.brand_names) && drug.brand_names.some(brand => 
          brand && typeof brand === 'string' && brand.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        drug.drug_class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(drug.indications) && drug.indications.some(indication => 
          indication && typeof indication === 'string' && indication.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    });
    setFilteredDrugs(filtered);
  };

  const handleFilter = (drugClass) => {
    setFilterClass(drugClass);
    const safeDrugs = Array.isArray(drugs) ? drugs : [];
    
    if (drugClass === "all") {
      setFilteredDrugs(safeDrugs);
    } else {
      const filtered = safeDrugs.filter(drug => drug && drug.drug_class === drugClass);
      setFilteredDrugs(filtered);
    }
  };

  const handleSave = async (drugData) => {
    try {
      if (editingDrug) {
        await Drug.update(editingDrug.id, drugData);
      } else {
        await Drug.create(drugData);
      }
      loadDrugs();
      setShowAddForm(false);
      setEditingDrug(null);
    } catch (error) {
      console.error("Error saving drug:", error);
      alert("Error saving drug. Please try again.");
    }
  };

  const uniqueDrugClasses = [...new Set(drugs.map(drug => drug?.drug_class).filter(Boolean))];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Pill className="w-8 h-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Drug Database</h1>
            <p className="text-slate-600">Comprehensive medication information system</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Drug
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <SearchSuggestions
            value={searchTerm}
            onChange={setSearchTerm}
            onSelect={(suggestion) => {
              if (suggestion.type === 'drug') {
                setSearchTerm(suggestion.name);
                // Auto-trigger search when drug is selected
                setTimeout(() => {
                  const event = { preventDefault: () => {} };
                  handleSearch(event);
                }, 100);
              }
            }}
            placeholder="Search by generic name, brand name, class, or indication..."
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </form>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={filterClass} onValueChange={handleFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by drug class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Drug Classes</SelectItem>
                {uniqueDrugClasses.map((drugClass) => (
                  <SelectItem key={drugClass} value={drugClass}>{drugClass}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <AddDrugForm
          drug={editingDrug}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false);
            setEditingDrug(null);
          }}
        />
      )}

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filteredDrugs.length} Medication{filteredDrugs.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDrugs.map((drug) => (
              <Card key={drug.id} className="hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm border-0">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-green-700">
                          {drug.generic_name}
                        </h3>
                        {drug.drug_class && (
                          <Badge className="bg-green-100 text-green-800">
                            {drug.drug_class}
                          </Badge>
                        )}
                      </div>

                      {drug.brand_names && drug.brand_names.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Brand Names:</p>
                          <div className="flex flex-wrap gap-1">
                            {drug.brand_names.map((brand) => (
                              <Badge key={brand} variant="outline" className="text-xs">
                                {brand}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {drug.mechanism_of_action && (
                        <div>
                          <p className="text-sm text-slate-600">Mechanism of Action:</p>
                          <p className="text-sm text-slate-700">{drug.mechanism_of_action}</p>
                        </div>
                      )}

                      {drug.indications && drug.indications.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Indications:</p>
                          <div className="flex flex-wrap gap-1">
                            {drug.indications.slice(0, 4).map((indication) => (
                              <Badge key={indication} variant="secondary" className="text-xs bg-blue-50">
                                {indication}
                              </Badge>
                            ))}
                            {drug.indications.length > 4 && (
                              <Badge variant="secondary" className="text-xs">
                                +{drug.indications.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {drug.icd10_codes && drug.icd10_codes.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Associated ICD-10 Codes:</p>
                          <div className="flex flex-wrap gap-1">
                            {drug.icd10_codes.slice(0, 3).map((code, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {code}
                              </Badge>
                            ))}
                            {drug.icd10_codes.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{drug.icd10_codes.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingDrug(drug);
                          setShowAddForm(true);
                        }}
                        className="text-green-600 border-green-600 hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
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
  );
}
