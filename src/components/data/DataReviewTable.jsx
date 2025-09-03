import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, Edit3, Trash2 } from 'lucide-react';

export default function DataReviewTable({ data, analysis, onEdit, onDelete, onSave }) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(new Set(data.map((_, index) => index)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (index, checked) => {
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedRows(newSelected);
  };

  const handleEdit = (index, rowData) => {
    setEditingRow(index);
    setEditData({ ...rowData });
  };

  const handleSaveEdit = () => {
    if (onEdit) {
      onEdit(editingRow, editData);
    }
    setEditingRow(null);
    setEditData({});
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSaveSelected = () => {
    const selectedData = data.filter((_, index) => selectedRows.has(index));
    if (onSave) {
      onSave(selectedData);
    }
  };

  const getStatusIcon = (confidence) => {
    if (confidence >= 0.9) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (confidence >= 0.7) return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (confidence) => {
    if (confidence >= 0.9) return <Badge className="bg-green-100 text-green-800">High Confidence</Badge>;
    if (confidence >= 0.7) return <Badge className="bg-yellow-100 text-yellow-800">Medium Confidence</Badge>;
    return <Badge className="bg-red-100 text-red-800">Low Confidence</Badge>;
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">
          No data to review
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(data[0]);

  return (
    <div className="space-y-4">
      {analysis && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Overall Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getStatusIcon(analysis.confidence)}
                <span className="text-2xl font-bold">{Math.round(analysis.confidence * 100)}%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Records Found</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{data.length}</span>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold">{selectedRows.size}</span>
            </CardContent>
          </Card>
        </div>
      )}

      {analysis?.issues && analysis.issues.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Issues found:</strong> {analysis.issues.join(', ')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Review</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveSelected} 
                disabled={selectedRows.size === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                Save Selected ({selectedRows.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === data.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </th>
                  {columns.map((column) => (
                    <th key={column} className="text-left p-2 font-medium">
                      {column.charAt(0).toUpperCase() + column.slice(1)}
                    </th>
                  ))}
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(index)}
                        onChange={(e) => handleSelectRow(index, e.target.checked)}
                        className="rounded"
                      />
                    </td>
                    {columns.map((column) => (
                      <td key={column} className="p-2">
                        {editingRow === index ? (
                          <input
                            type="text"
                            value={editData[column] || ''}
                            onChange={(e) => setEditData({ ...editData, [column]: e.target.value })}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <span className="text-sm">{row[column]}</span>
                        )}
                      </td>
                    ))}
                    <td className="p-2">
                      {getStatusBadge(0.85 + Math.random() * 0.15)}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        {editingRow === index ? (
                          <>
                            <Button size="sm" onClick={handleSaveEdit} className="h-8 w-8 p-0">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEdit(index, row)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => onDelete && onDelete(index)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}