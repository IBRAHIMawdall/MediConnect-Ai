import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Save, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function AddCodeForm({ 
  initialData = null, 
  onSave, 
  onCancel, 
  isEditing = false,
  loading = false 
}) {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    category: '',
    subcategory: '',
    notes: '',
    severity: '',
    type: ''
  });
  
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle, saving, success, error

  const categories = {
    infectious: 'Infectious and Parasitic Diseases (A00-B99)',
    neoplasms: 'Neoplasms (C00-D49)',
    blood: 'Blood and Immune System (D50-D89)',
    endocrine: 'Endocrine, Nutritional and Metabolic (E00-E89)',
    mental: 'Mental and Behavioral Disorders (F01-F99)',
    nervous: 'Nervous System (G00-G99)',
    eye: 'Eye and Adnexa (H00-H59)',
    ear: 'Ear and Mastoid Process (H60-H95)',
    circulatory: 'Circulatory System (I00-I99)',
    respiratory: 'Respiratory System (J00-J99)',
    digestive: 'Digestive System (K00-K95)',
    skin: 'Skin and Subcutaneous Tissue (L00-L99)',
    musculoskeletal: 'Musculoskeletal System (M00-M99)',
    genitourinary: 'Genitourinary System (N00-N99)',
    pregnancy: 'Pregnancy, Childbirth and Puerperium (O00-O9A)',
    perinatal: 'Perinatal Period (P00-P96)',
    congenital: 'Congenital Malformations (Q00-Q99)',
    symptoms: 'Symptoms and Abnormal Findings (R00-R99)',
    injury: 'Injury, Poisoning and External Causes (S00-T88)',
    external: 'External Causes of Morbidity (V00-Y99)',
    health: 'Health Services Contact (Z00-Z99)'
  };

  const severityLevels = {
    mild: 'Mild',
    moderate: 'Moderate',
    severe: 'Severe',
    critical: 'Critical'
  };

  const codeTypes = {
    primary: 'Primary Diagnosis',
    secondary: 'Secondary Diagnosis',
    complication: 'Complication',
    comorbidity: 'Comorbidity'
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        description: initialData.description || '',
        category: initialData.category || '',
        subcategory: initialData.subcategory || '',
        notes: initialData.notes || '',
        severity: initialData.severity || '',
        type: initialData.type || ''
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.code.trim()) {
      newErrors.code = 'ICD-10 code is required';
    } else if (!/^[A-Z]\d{2}(\.\d{1,2})?$/.test(formData.code.trim())) {
      newErrors.code = 'Invalid ICD-10 code format (e.g., E11.9)';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setStatus('saving');
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (onSave) {
        await onSave(formData);
      }
      
      setStatus('success');
      
      // Reset form if not editing
      if (!isEditing) {
        setFormData({
          code: '',
          description: '',
          category: '',
          subcategory: '',
          notes: '',
          severity: '',
          type: ''
        });
      }
      
      // Auto-hide success message
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCancel = () => {
    setFormData({
      code: '',
      description: '',
      category: '',
      subcategory: '',
      notes: '',
      severity: '',
      type: ''
    });
    setErrors({});
    setStatus('idle');
    
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Save className="w-5 h-5" />
              Edit ICD-10 Code
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Add New ICD-10 Code
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              ICD-10 code {isEditing ? 'updated' : 'added'} successfully!
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to {isEditing ? 'update' : 'save'} ICD-10 code. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">ICD-10 Code *</label>
              <Input
                type="text"
                placeholder="e.g., E11.9"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => handleInputChange('category', value)}
              >
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categories).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-red-600">{errors.category}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              placeholder="Enter detailed description of the condition..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subcategory</label>
              <Input
                type="text"
                placeholder="e.g., Diabetes mellitus"
                value={formData.subcategory}
                onChange={(e) => handleInputChange('subcategory', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select 
                value={formData.severity} 
                onValueChange={(value) => handleInputChange('severity', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(severityLevels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(codeTypes).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Notes</label>
            <Textarea
              placeholder="Any additional notes, contraindications, or special considerations..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              disabled={status === 'saving'}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {status === 'saving' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isEditing ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {isEditing ? 'Update Code' : 'Save Code'}
                </>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={status === 'saving'}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}