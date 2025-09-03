import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Pill, FileText, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data for suggestions - in a real app, this would come from your API
const mockSuggestions = {
  drugs: [
    { id: 1, name: "Metformin", type: "drug", category: "Antidiabetic", generic: "Metformin HCl" },
    { id: 2, name: "Lisinopril", type: "drug", category: "ACE Inhibitor", generic: "Lisinopril" },
    { id: 3, name: "Atorvastatin", type: "drug", category: "Statin", generic: "Atorvastatin Calcium" },
    { id: 4, name: "Amlodipine", type: "drug", category: "Calcium Channel Blocker", generic: "Amlodipine Besylate" },
    { id: 5, name: "Omeprazole", type: "drug", category: "Proton Pump Inhibitor", generic: "Omeprazole" },
    { id: 6, name: "Levothyroxine", type: "drug", category: "Thyroid Hormone", generic: "Levothyroxine Sodium" },
    { id: 7, name: "Albuterol", type: "drug", category: "Bronchodilator", generic: "Albuterol Sulfate" },
    { id: 8, name: "Hydrochlorothiazide", type: "drug", category: "Diuretic", generic: "HCTZ" },
    { id: 9, name: "Gabapentin", type: "drug", category: "Anticonvulsant", generic: "Gabapentin" },
    { id: 10, name: "Sertraline", type: "drug", category: "SSRI", generic: "Sertraline HCl" }
  ],
  icd10: [
    { id: 1, code: "E11.9", name: "Type 2 diabetes mellitus without complications", type: "icd10", category: "Endocrine" },
    { id: 2, code: "I10", name: "Essential hypertension", type: "icd10", category: "Circulatory" },
    { id: 3, code: "E78.5", name: "Hyperlipidemia, unspecified", type: "icd10", category: "Endocrine" },
    { id: 4, code: "J44.1", name: "Chronic obstructive pulmonary disease with acute exacerbation", type: "icd10", category: "Respiratory" },
    { id: 5, code: "F32.9", name: "Major depressive disorder, single episode, unspecified", type: "icd10", category: "Mental Health" },
    { id: 6, code: "M79.3", name: "Panniculitis, unspecified", type: "icd10", category: "Musculoskeletal" },
    { id: 7, code: "K21.9", name: "Gastro-esophageal reflux disease without esophagitis", type: "icd10", category: "Digestive" },
    { id: 8, code: "E03.9", name: "Hypothyroidism, unspecified", type: "icd10", category: "Endocrine" },
    { id: 9, code: "J45.9", name: "Asthma, unspecified", type: "icd10", category: "Respiratory" },
    { id: 10, code: "G89.29", name: "Other chronic pain", type: "icd10", category: "Neurological" }
  ],
  conditions: [
    { id: 1, name: "Diabetes", type: "condition", keywords: ["diabetes", "blood sugar", "glucose"] },
    { id: 2, name: "Hypertension", type: "condition", keywords: ["high blood pressure", "hypertension", "bp"] },
    { id: 3, name: "Asthma", type: "condition", keywords: ["asthma", "breathing", "wheezing"] },
    { id: 4, name: "Depression", type: "condition", keywords: ["depression", "mood", "mental health"] },
    { id: 5, name: "Arthritis", type: "condition", keywords: ["arthritis", "joint pain", "inflammation"] },
    { id: 6, name: "Migraine", type: "condition", keywords: ["migraine", "headache", "pain"] },
    { id: 7, name: "COPD", type: "condition", keywords: ["copd", "chronic obstructive", "lung disease"] },
    { id: 8, name: "Heart Disease", type: "condition", keywords: ["heart disease", "cardiac", "cardiovascular"] }
  ]
};

const SearchSuggestions = ({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = "Search medical terms, drugs, or ICD codes...", 
  className,
  maxSuggestions = 8,
  showIcons = true,
  autoFocus = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionRefs = useRef([]);

  // Filter suggestions based on input
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const query = value.toLowerCase();
    const allSuggestions = [
      ...mockSuggestions.drugs,
      ...mockSuggestions.icd10,
      ...mockSuggestions.conditions
    ];

    const filtered = allSuggestions.filter(item => {
      if (item.type === 'drug') {
        return item.name.toLowerCase().includes(query) || 
               item.generic.toLowerCase().includes(query) ||
               item.category.toLowerCase().includes(query);
      } else if (item.type === 'icd10') {
        return item.code.toLowerCase().includes(query) || 
               item.name.toLowerCase().includes(query) ||
               item.category.toLowerCase().includes(query);
      } else if (item.type === 'condition') {
        return item.name.toLowerCase().includes(query) ||
               item.keywords.some(keyword => keyword.toLowerCase().includes(query));
      }
      return false;
    }).slice(0, maxSuggestions);

    setSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setHighlightedIndex(-1);
  }, [value, maxSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion selection
  const handleSelect = (suggestion) => {
    const selectedValue = suggestion.type === 'icd10' 
      ? `${suggestion.code} - ${suggestion.name}`
      : suggestion.name;
    
    onChange(selectedValue);
    onSelect?.(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  // Get icon for suggestion type
  const getIcon = (type) => {
    if (!showIcons) return null;
    
    switch (type) {
      case 'drug':
        return <Pill className="w-4 h-4 text-green-600" />;
      case 'icd10':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'condition':
        return <Stethoscope className="w-4 h-4 text-purple-600" />;
      default:
        return <Search className="w-4 h-4 text-gray-600" />;
    }
  };

  // Get badge color for suggestion type
  const getBadgeVariant = (type) => {
    switch (type) {
      case 'drug':
        return 'default';
      case 'icd10':
        return 'secondary';
      case 'condition':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          placeholder={placeholder}
          className={cn("pl-10", className)}
          autoFocus={autoFocus}
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.type}-${suggestion.id}`}
              ref={el => suggestionRefs.current[index] = el}
              className={cn(
                "px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 hover:bg-gray-50",
                highlightedIndex === index && "bg-blue-50"
              )}
              onClick={() => handleSelect(suggestion)}
            >
              <div className="flex items-start gap-3">
                {getIcon(suggestion.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {suggestion.type === 'icd10' ? suggestion.code : suggestion.name}
                    </span>
                    <Badge variant={getBadgeVariant(suggestion.type)} className="text-xs">
                      {suggestion.type.toUpperCase()}
                    </Badge>
                  </div>
                  
                  {suggestion.type === 'icd10' && (
                    <p className="text-sm text-gray-600 truncate">{suggestion.name}</p>
                  )}
                  
                  {suggestion.type === 'drug' && (
                    <p className="text-sm text-gray-600 truncate">
                      {suggestion.generic} • {suggestion.category}
                    </p>
                  )}
                  
                  {suggestion.category && suggestion.type !== 'drug' && (
                    <p className="text-xs text-gray-500">{suggestion.category}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;