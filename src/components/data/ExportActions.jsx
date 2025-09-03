import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Download, 
  FileText, 
  Database, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Filter
} from 'lucide-react';

export default function ExportActions({ onExport }) {
  const [exportType, setExportType] = useState('csv');
  const [dataType, setDataType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [status, setStatus] = useState('idle'); // idle, exporting, success, error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const exportFormats = {
    csv: { label: 'CSV', icon: FileText, description: 'Comma-separated values' },
    json: { label: 'JSON', icon: Database, description: 'JavaScript Object Notation' },
    xlsx: { label: 'Excel', icon: FileText, description: 'Microsoft Excel format' }
  };

  const dataTypes = {
    all: 'All Data',
    icd: 'ICD-10 Codes Only',
    drugs: 'Drugs Only',
    recent: 'Recent Activity'
  };

  const dateRanges = {
    all: 'All Time',
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    quarter: 'Last 3 Months',
    year: 'Last Year'
  };

  const handleExport = async () => {
    setStatus('exporting');
    setError('');
    setProgress(0);

    try {
      // Simulate export progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Mock export data generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setProgress(100);

      // Generate mock export data
      const exportData = generateMockExportData(dataType, exportType);
      
      // Create and download file
      downloadFile(exportData, `medical_data_${Date.now()}.${exportType}`);
      
      setStatus('success');
      
      if (onExport) {
        onExport({
          format: exportType,
          dataType,
          dateRange,
          recordCount: exportData.recordCount
        });
      }
    } catch (err) {
      setError('Export failed. Please try again.');
      setStatus('error');
    }
  };

  const generateMockExportData = (type, format) => {
    const icdData = [
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' },
      { code: 'I10', description: 'Essential hypertension', category: 'Cardiovascular' },
      { code: 'J44.1', description: 'COPD with acute exacerbation', category: 'Respiratory' }
    ];

    const drugData = [
      { name: 'Metformin', genericName: 'Metformin HCl', dosage: '500mg', form: 'Tablet' },
      { name: 'Lisinopril', genericName: 'Lisinopril', dosage: '10mg', form: 'Tablet' },
      { name: 'Albuterol', genericName: 'Albuterol sulfate', dosage: '90mcg', form: 'Inhaler' }
    ];

    let data;
    switch (type) {
      case 'icd':
        data = icdData;
        break;
      case 'drugs':
        data = drugData;
        break;
      case 'all':
      default:
        data = { icd10Codes: icdData, drugs: drugData };
        break;
    }

    return {
      data,
      recordCount: Array.isArray(data) ? data.length : icdData.length + drugData.length,
      exportedAt: new Date().toISOString(),
      format,
      filters: { dataType, dateRange }
    };
  };

  const downloadFile = (data, filename) => {
    let content;
    let mimeType;

    switch (exportType) {
      case 'csv':
        content = convertToCSV(data.data);
        mimeType = 'text/csv';
        break;
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        break;
      case 'xlsx':
        // For demo purposes, we'll export as CSV
        content = convertToCSV(data.data);
        mimeType = 'text/csv';
        break;
      default:
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const convertToCSV = (data) => {
    if (!Array.isArray(data)) {
      // Handle object with multiple arrays
      let csv = '';
      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key])) {
          csv += `\n${key.toUpperCase()}\n`;
          csv += arrayToCSV(data[key]);
        }
      });
      return csv;
    }
    return arrayToCSV(data);
  };

  const arrayToCSV = (array) => {
    if (array.length === 0) return '';
    
    const headers = Object.keys(array[0]);
    const csvHeaders = headers.join(',');
    const csvRows = array.map(row => 
      headers.map(header => `"${row[header] || ''}"`).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  };

  const resetExport = () => {
    setStatus('idle');
    setProgress(0);
    setError('');
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {status === 'idle' && (
          <>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select value={exportType} onValueChange={setExportType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(exportFormats).map(([key, format]) => {
                      const Icon = format.icon;
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            <span>{format.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {exportFormats[exportType]?.description}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  Data Type
                </label>
                <Select value={dataType} onValueChange={setDataType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dataTypes).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Date Range
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dateRanges).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleExport} className="bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </div>
          </>
        )}

        {status === 'exporting' && (
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <div className="space-y-2">
              <p className="font-medium">Preparing your export...</p>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-slate-500">{progress}% complete</p>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center space-y-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-green-800">Export Successful!</h3>
              <p className="text-sm text-slate-600">Your file has been downloaded.</p>
            </div>
            <Button onClick={resetExport} variant="outline">
              Export Another File
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <div className="flex justify-center gap-2">
              <Button onClick={handleExport} variant="outline">
                Try Again
              </Button>
              <Button onClick={resetExport} variant="outline">
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}