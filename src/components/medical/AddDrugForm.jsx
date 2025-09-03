import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, X, AlertCircle, CheckCircle, Pill } from 'lucide-react';

export default function AddDrugForm({ 
  initialData = null, 
  onSave, 
  onCancel, 
  isEditing = false,
  loading = false 
}) {
  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    brandName: '',
    category: '',
    dosageForm: '',
    strength: '',
    manufacturer: '',
    description: '',
    indications: '',
    contraindications: '',
    sideEffects: '',
    dosage: '',
    interactions: '',
    warnings: '',
    storage: '',
    price: '',
    availability: 'available'
  });
  
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle, saving, success, error

  const drugCategories = {
    analgesics: 'Analgesics & Pain Relief',
    antibiotics: 'Antibiotics & Anti-infectives',
    cardiovascular: 'Cardiovascular',
    diabetes: 'Diabetes & Endocrine',
    gastrointestinal: 'Gastrointestinal',
    respiratory: 'Respiratory',
    neurological: 'Neurological & Psychiatric',
    dermatological: 'Dermatological',
    ophthalmological: 'Ophthalmological',
    gynecological: 'Gynecological & Obstetric',
    pediatric: 'Pediatric',
    oncology: 'Oncology',
    immunology: 'Immunology & Vaccines',
    vitamins: 'Vitamins & Supplements',
    emergency: 'Emergency & Critical Care'
  };

  const dosageForms = {
    tablet: 'Tablet',
    capsule: 'Capsule',
    syrup: 'Syrup/Liquid',
    injection: 'Injection',
    cream: 'Cream/Ointment',
    drops: 'Drops',
    inhaler: 'Inhaler',
    patch: 'Patch',
    suppository: 'Suppository',
    powder: 'Powder',
    gel: 'Gel',
    spray: 'Spray'
  };

  const availabilityOptions = {
    available: 'Available',
    limited: 'Limited Stock',
    unavailable: 'Out of Stock',
    discontinued: 'Discontinued'
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        genericName: initialData.genericName || '',
        brandName: initialData.brandName || '',
        category: initialData.category || '',
        dosageForm: initialData.dosageForm || '',
        strength: initialData.strength || '',
        manufacturer: initialData.manufacturer || '',
        description: initialData.description || '',
        indications: initialData.indications || '',
        contraindications: initialData.contraindications || '',
        sideEffects: initialData.sideEffects || '',
        dosage: initialData.dosage || '',
        interactions: initialData.interactions || '',
        warnings: initialData.warnings || '',
        storage: initialData.storage || '',
        price: initialData.price || '',
        availability: initialData.availability || 'available'
      });
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Drug name is required';
    }

    if (!formData.genericName.trim()) {
      newErrors.genericName = 'Generic name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.dosageForm) {
      newErrors.dosageForm = 'Dosage form is required';
    }

    if (!formData.strength.trim()) {
      newErrors.strength = 'Strength is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    }

    if (formData.price && isNaN(parseFloat(formData.price))) {
      newErrors.price = 'Price must be a valid number';
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
          name: '',
          genericName: '',
          brandName: '',
          category: '',
          dosageForm: '',
          strength: '',
          manufacturer: '',
          description: '',
          indications: '',
          contraindications: '',
          sideEffects: '',
          dosage: '',
          interactions: '',
          warnings: '',
          storage: '',
          price: '',
          availability: 'available'
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
      name: '',
      genericName: '',
      brandName: '',
      category: '',
      dosageForm: '',
      strength: '',
      manufacturer: '',
      description: '',
      indications: '',
      contraindications: '',
      sideEffects: '',
      dosage: '',
      interactions: '',
      warnings: '',
      storage: '',
      price: '',
      availability: 'available'
    });
    setErrors({});
    setStatus('idle');
    
    if (onCancel) {
      onCancel();
    }
  };

  const getAvailabilityBadgeColor = (availability) => {
    switch (availability) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'limited': return 'bg-yellow-100 text-yellow-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      case 'discontinued': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Save className="w-5 h-5" />
              Edit Drug Information
            </>
          ) : (
            <>
              <Pill className="w-5 h-5" />
              Add New Drug
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'success' && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Drug information {isEditing ? 'updated' : 'added'} successfully!
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Failed to {isEditing ? 'update' : 'save'} drug information. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Drug Name *</label>
                <Input
                  type="text"
                  placeholder="e.g., Paracetamol"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Generic Name *</label>
                <Input
                  type="text"
                  placeholder="e.g., Acetaminophen"
                  value={formData.genericName}
                  onChange={(e) => handleInputChange('genericName', e.target.value)}
                  className={errors.genericName ? 'border-red-500' : ''}
                />
                {errors.genericName && (
                  <p className="text-sm text-red-600">{errors.genericName}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Brand Name</label>
                <Input
                  type="text"
                  placeholder="e.g., Tylenol"
                  value={formData.brandName}
                  onChange={(e) => handleInputChange('brandName', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Manufacturer</label>
                <Input
                  type="text"
                  placeholder="e.g., Johnson & Johnson"
                  value={formData.manufacturer}
                  onChange={(e) => handleInputChange('manufacturer', e.target.value)}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
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
                    {Object.entries(drugCategories).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dosage Form *</label>
                <Select 
                  value={formData.dosageForm} 
                  onValueChange={(value) => handleInputChange('dosageForm', value)}
                >
                  <SelectTrigger className={errors.dosageForm ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select form" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(dosageForms).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.dosageForm && (
                  <p className="text-sm text-red-600">{errors.dosageForm}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Strength *</label>
                <Input
                  type="text"
                  placeholder="e.g., 500mg"
                  value={formData.strength}
                  onChange={(e) => handleInputChange('strength', e.target.value)}
                  className={errors.strength ? 'border-red-500' : ''}
                />
                {errors.strength && (
                  <p className="text-sm text-red-600">{errors.strength}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Availability</label>
                <Select 
                  value={formData.availability} 
                  onValueChange={(value) => handleInputChange('availability', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(availabilityOptions).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Badge className={getAvailabilityBadgeColor(key)}>
                            {label}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price (Optional)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g., 15.99"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  className={errors.price ? 'border-red-500' : ''}
                />
                {errors.price && (
                  <p className="text-sm text-red-600">{errors.price}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Storage Conditions</label>
                <Input
                  type="text"
                  placeholder="e.g., Store at room temperature"
                  value={formData.storage}
                  onChange={(e) => handleInputChange('storage', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Clinical Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Clinical Information</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                placeholder="Detailed description of the drug, its mechanism of action, and therapeutic uses..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={errors.description ? 'border-red-500' : ''}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Indications</label>
                <Textarea
                  placeholder="Conditions and symptoms this drug is used to treat..."
                  value={formData.indications}
                  onChange={(e) => handleInputChange('indications', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contraindications</label>
                <Textarea
                  placeholder="Conditions where this drug should not be used..."
                  value={formData.contraindications}
                  onChange={(e) => handleInputChange('contraindications', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Side Effects</label>
                <Textarea
                  placeholder="Common and serious side effects..."
                  value={formData.sideEffects}
                  onChange={(e) => handleInputChange('sideEffects', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Dosage Instructions</label>
                <Textarea
                  placeholder="Recommended dosage and administration instructions..."
                  value={formData.dosage}
                  onChange={(e) => handleInputChange('dosage', e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Drug Interactions</label>
                <Textarea
                  placeholder="Known drug interactions and precautions..."
                  value={formData.interactions}
                  onChange={(e) => handleInputChange('interactions', e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Warnings & Precautions</label>
                <Textarea
                  placeholder="Important warnings and special precautions..."
                  value={formData.warnings}
                  onChange={(e) => handleInputChange('warnings', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
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
                  {isEditing ? 'Update Drug' : 'Save Drug'}
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