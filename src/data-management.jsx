import React, { useState, useCallback } from "react";
import { UploadFile, ExtractDataFromUploadedFile } from "@/integrations/Core";
import { ICD10Code, Drug } from "@/entities/all";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  UploadCloud, 
  File, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Table, 
  Download,
  Database,
  FileText,
  Pill
} from "lucide-react";

import DataReviewTable from "./src/components/data/DataReviewTable";
import ExportActions from "./src/components/data/ExportActions";

const fileTypes = {
  'text/csv': 'CSV',
  'application/json': 'JSON',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
};

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState("import");
  const [file, setFile] = useState(null);
  const [dataType, setDataType] = useState("icd");
  const [status, setStatus] = useState("idle"); // idle, uploading, analyzing, reviewing, saving, done, error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [extractedData, setExtractedData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = React.useRef(null);

  const processFile = (selectedFile) => {
    const acceptedTypes = ['text/csv', 'application/json', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (selectedFile && acceptedTypes.includes(selectedFile.type)) {
      setFile(selectedFile);
      setStatus("idle");
      setError("");
    } else {
      setError("Invalid file type. Please upload a CSV, JSON, XLS, or XLSX file.");
    }
  };
  
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  
  const handleFileSelect = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!file || !dataType) return;

    setStatus("uploading");
    setProgress(10);
    setError("");
    setExtractedData([]);
    setAnalysis(null);

    try {
      const { file_url } = await UploadFile({ file });
      setProgress(30);
      setStatus("analyzing");

      const schema = dataType === "icd" ? ICD10Code.schema() : Drug.schema();
      const response = await ExtractDataFromUploadedFile({ file_url, json_schema: schema });
      
      setProgress(70);

      if (response.status === 'success' && response.output) {
        // Ensure we have an array to work with
        const outputArray = Array.isArray(response.output) ? response.output : [response.output];
        
        const existingData = dataType === 'icd' 
          ? await ICD10Code.list()
          : await Drug.list();
        
        const safeExistingData = Array.isArray(existingData) ? existingData : [];
        const existingRecords = dataType === 'icd' 
          ? new Set(safeExistingData.map(d => d.code).filter(Boolean))
          : new Set(safeExistingData.map(d => d.generic_name ? d.generic_name.toLowerCase() : '').filter(Boolean));
        
        const newRecords = [];
        const duplicateRecords = [];
        const recordsWithIssues = [];

        outputArray.forEach(item => {
          if (!item) {
            recordsWithIssues.push(item);
            return;
          }
          
          const key = dataType === 'icd' ? item.code : item.generic_name?.toLowerCase();
          if (!key) {
            recordsWithIssues.push(item);
          } else if (existingRecords.has(key)) {
            duplicateRecords.push(item);
          } else {
            newRecords.push(item);
          }
        });
        
        setExtractedData(outputArray);
        setAnalysis({ newRecords, duplicateRecords, recordsWithIssues });
        setStatus("reviewing");
      } else {
        throw new Error(response.details || "AI could not process the file. Please check the file format and content.");
      }

      setProgress(100);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      setStatus("error");
    }
  };

  const handleSave = async (dataToSave) => {
    setStatus("saving");
    setError("");
    try {
      if (dataType === "icd") {
        await ICD10Code.bulkCreate(dataToSave);
      } else {
        await Drug.bulkCreate(dataToSave);
      }
      setStatus("done");
    } catch (err) {
      setError("Failed to save data to the database.");
      setStatus("error");
    }
  };

  const resetImport = () => {
    setFile(null);
    setStatus("idle");
    setExtractedData([]);
    setAnalysis(null);
    setError("");
    setProgress(0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Data Management</h1>
          <p className="text-slate-600">Import and export your medical database with AI assistance</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">AI-Powered Import</TabsTrigger>
          <TabsTrigger value="export">Export Data</TabsTrigger>
        </TabsList>

        {/* IMPORT TAB */}
        <TabsContent value="import">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Import New Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {status === "idle" && (
                <div className="grid md:grid-cols-2 gap-6 items-center">
                  <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                    className={`p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'
                    }`}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      accept=".csv,.json,.xls,.xlsx"
                      className="hidden"
                    />
                    <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    {file ? (
                      <div>
                        <p className="font-semibold text-slate-700">{file.name}</p>
                        <p className="text-sm text-slate-500">{fileTypes[file.type] || 'File'}</p>
                      </div>
                    ) : (
                      <p className="text-slate-500">Drag & drop a file here, or click to select a file (CSV, JSON, XLSX)</p>
                    )}
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600">Our AI will analyze your file, clean the data, and map it to your database schema. You'll be able to review everything before it's saved.</p>
                    <Select value={dataType} onValueChange={setDataType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data type to import..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="icd">ICD-10 Codes</SelectItem>
                        <SelectItem value="drug">Drug Information</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAnalyze} disabled={!file} className="w-full">
                      Upload and Analyze File
                    </Button>
                  </div>
                </div>
              )}

              {(status === "uploading" || status === "analyzing") && (
                <div className="text-center p-8 space-y-4">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" />
                  <p className="text-slate-600">
                    {status === "uploading" ? "Uploading file..." : "Analyzing data with AI..."}
                  </p>
                  <Progress value={progress} className="w-full max-w-md mx-auto" />
                </div>
              )}

              {status === "reviewing" && (
                <DataReviewTable 
                  data={extractedData}
                  analysis={analysis}
                  onSave={handleSave}
                  onCancel={resetImport}
                />
              )}

              {status === "saving" && (
                <div className="text-center p-8 space-y-4">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-green-600" />
                  <p className="text-slate-600">Saving data to database...</p>
                  <Progress value={progress} className="w-full max-w-md mx-auto" />
                </div>
              )}

              {status === "done" && (
                <div className="text-center p-8 space-y-4">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
                  <p className="text-lg font-semibold text-slate-700">Import Complete!</p>
                  <p className="text-slate-600">Your data has been successfully imported.</p>
                  <Button onClick={resetImport}>Import Another File</Button>
                </div>
              )}

              {status === "error" && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">Import Failed</AlertTitle>
                  <AlertDescription className="text-red-700">
                    {error}
                  </AlertDescription>
                  <Button onClick={resetImport} className="mt-4">Try Again</Button>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <ExportActions />
        </TabsContent>
      </Tabs>
    </div>
  );
}