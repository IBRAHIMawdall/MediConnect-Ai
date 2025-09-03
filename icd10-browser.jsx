
import React, { useState, useEffect } from "react";
import { ICD10Code } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Edit, Stethoscope } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import CodeSearchForm from "@/components/medical/CodeSearchForm";
import AddCodeForm from "@/components/medical/AddCodeForm";

export default function ICD10Browser() {
  const [codes, setCodes] = useState([]);
  const [filteredCodes, setFilteredCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCode, setEditingCode] = useState(null);

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      setIsLoading(true);
      const data = await ICD10Code.list("-created_date", 100);
      const safeCodes = Array.isArray(data) ? data : [];
      setCodes(safeCodes);
      setFilteredCodes(safeCodes);
    } catch (error) {
      console.error("Error loading ICD-10 codes:", error);
      setCodes([]); // Ensure codes is an array even on error
      setFilteredCodes([]); // Ensure filteredCodes is an array even on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (searchTerm) => {
    if (!searchTerm.trim()) {
      setFilteredCodes(codes);
      return;
    }

    const safeCodes = Array.isArray(codes) ? codes : [];
    const filtered = safeCodes.filter(code => {
      if (!code) return false; // Skip null/undefined entries

      return code.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(code.keywords) && code.keywords.some(keyword =>
          keyword && keyword.toLowerCase().includes(searchTerm.toLowerCase()) // Check keyword for null/undefined
        ));
    });
    setFilteredCodes(filtered);
  };

  const handleFilter = (filters) => {
    const safeCodes = Array.isArray(codes) ? codes : [];
    let filtered = [...safeCodes];

    if (filters.category !== "all") {
      filtered = filtered.filter(code => code && code.category === filters.category); // Check code for null/undefined
    }

    if (filters.specialty !== "all") {
      filtered = filtered.filter(code => code && code.specialty === filters.specialty); // Check code for null/undefined
    }

    setFilteredCodes(filtered);
  };

  const handleSave = async (codeData) => {
    try {
      if (editingCode) {
        await ICD10Code.update(editingCode.id, codeData);
      } else {
        await ICD10Code.create(codeData);
      }
      loadCodes();
      setShowAddForm(false);
      setEditingCode(null);
    } catch (error) {
      console.error("Error saving code:", error);
      alert("Error saving code. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-800">ICD-10 Code Browser</h1>
            <p className="text-slate-600">Manage and explore diagnosis codes</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add New Code
        </Button>
      </div>

      {/* Search & Filter */}
      <CodeSearchForm
        onSearch={handleSearch}
        onFilter={handleFilter}
        isLoading={isLoading}
      />

      {/* Add/Edit Form */}
      {showAddForm && (
        <AddCodeForm
          code={editingCode}
          onSave={handleSave}
          onCancel={() => {
            setShowAddForm(false);
            setEditingCode(null);
          }}
        />
      )}

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filteredCodes.length} Code{filteredCodes.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredCodes.map((code) => (
              <Card key={code.id} className="hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm border-0">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                          {code.code}
                        </span>
                        {code.specialty && (
                          <Badge variant="outline" className="gap-1">
                            <Stethoscope className="w-3 h-3" />
                            {code.specialty}
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-slate-800 leading-tight">
                        {code.title}
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        {code.category && (
                          <Badge className="bg-green-100 text-green-800">
                            {code.category}
                          </Badge>
                        )}
                        {code.keywords && Array.isArray(code.keywords) && code.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>

                      {code.commonly_prescribed_drugs && Array.isArray(code.commonly_prescribed_drugs) && code.commonly_prescribed_drugs.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Common treatments:</p>
                          <div className="flex flex-wrap gap-1">
                            {code.commonly_prescribed_drugs.slice(0, 4).map((drug) => (
                              <Badge key={drug} variant="outline" className="text-xs bg-purple-50">
                                {drug}
                              </Badge>
                            ))}
                            {code.commonly_prescribed_drugs.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{code.commonly_prescribed_drugs.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingCode(code);
                        setShowAddForm(true);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredCodes.length === 0 && (
          <Card className="border-2 border-dashed">
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No ICD-10 codes found</h3>
              <p className="text-slate-500 mb-4">Start building your database by adding some diagnosis codes</p>
              <Button onClick={() => setShowAddForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Code
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
