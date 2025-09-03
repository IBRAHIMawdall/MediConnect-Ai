// Core integration functions for API calls and external services
// These are placeholder implementations for development

import axios from 'axios';

// Configure axios defaults
const api = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// File upload function
export async function UploadFile(file, options = {}) {
  try {
    // Mock implementation for development
    console.log('UploadFile called with:', file.name, options);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock response
    return {
      success: true,
      fileId: `file_${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
      url: `https://mock-storage.example.com/files/file_${Date.now()}`
    };
  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error('Failed to upload file');
  }
}

// Data extraction from uploaded files
export async function ExtractDataFromUploadedFile(fileId, dataType = 'auto') {
  try {
    console.log('ExtractDataFromUploadedFile called with:', fileId, dataType);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Return mock extracted data based on dataType
    if (dataType === 'icd' || dataType === 'auto') {
      return {
        success: true,
        dataType: 'icd10',
        recordCount: 150,
        data: [
          {
            code: 'E11.9',
            description: 'Type 2 diabetes mellitus without complications',
            category: 'Endocrine, nutritional and metabolic diseases',
            subcategory: 'Diabetes mellitus'
          },
          {
            code: 'I10',
            description: 'Essential (primary) hypertension',
            category: 'Diseases of the circulatory system',
            subcategory: 'Hypertensive diseases'
          },
          {
            code: 'J44.1',
            description: 'Chronic obstructive pulmonary disease with acute exacerbation',
            category: 'Diseases of the respiratory system',
            subcategory: 'Chronic lower respiratory diseases'
          }
        ],
        analysis: {
          confidence: 0.95,
          issues: [],
          suggestions: ['Data appears clean and well-formatted', 'All required fields are present']
        }
      };
    } else if (dataType === 'drug') {
      return {
        success: true,
        dataType: 'drug',
        recordCount: 200,
        data: [
          {
            name: 'Metformin',
            genericName: 'Metformin hydrochloride',
            brandName: 'Glucophage',
            dosage: '500mg',
            form: 'Tablet',
            manufacturer: 'Bristol-Myers Squibb',
            category: 'Antidiabetic agents'
          },
          {
            name: 'Lisinopril',
            genericName: 'Lisinopril',
            brandName: 'Prinivil',
            dosage: '10mg',
            form: 'Tablet',
            manufacturer: 'Merck & Co.',
            category: 'ACE inhibitors'
          }
        ],
        analysis: {
          confidence: 0.92,
          issues: ['Some dosage formats need standardization'],
          suggestions: ['Consider normalizing dosage units', 'Verify manufacturer names']
        }
      };
    }
  } catch (error) {
    console.error('Data extraction failed:', error);
    throw new Error('Failed to extract data from file');
  }
}

// AI-powered LLM invocation
export async function InvokeLLM(prompt, options = {}) {
  try {
    console.log('InvokeLLM called with prompt:', prompt.substring(0, 100) + '...');
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock AI response based on prompt content
    if (prompt.toLowerCase().includes('icd') && prompt.toLowerCase().includes('drug')) {
      return {
        success: true,
        response: {
          mappings: [
            {
              icd10Code: 'E11.9',
              icd10Description: 'Type 2 diabetes mellitus without complications',
              suggestedDrugs: [
                { name: 'Metformin', confidence: 0.95, reasoning: 'First-line treatment for T2DM' },
                { name: 'Glipizide', confidence: 0.85, reasoning: 'Alternative sulfonylurea option' }
              ]
            },
            {
              icd10Code: 'I10',
              icd10Description: 'Essential hypertension',
              suggestedDrugs: [
                { name: 'Lisinopril', confidence: 0.92, reasoning: 'ACE inhibitor, first-line for HTN' },
                { name: 'Amlodipine', confidence: 0.88, reasoning: 'Calcium channel blocker alternative' }
              ]
            }
          ],
          confidence: 0.91,
          reasoning: 'Mappings based on current clinical guidelines and evidence-based medicine'
        }
      };
    } else if (prompt.toLowerCase().includes('search') || prompt.toLowerCase().includes('find')) {
      return {
        success: true,
        response: {
          results: [
            {
              type: 'icd10',
              code: 'E11.9',
              description: 'Type 2 diabetes mellitus without complications',
              relevance: 0.95
            },
            {
              type: 'drug',
              name: 'Metformin',
              description: 'Antidiabetic medication for type 2 diabetes',
              relevance: 0.93
            }
          ],
          totalResults: 25,
          searchTime: '0.15s'
        }
      };
    } else {
      return {
        success: true,
        response: {
          text: 'This is a mock AI response. The actual implementation would connect to a real LLM service like OpenAI, Anthropic, or a local model.',
          confidence: 0.85,
          tokens_used: 150
        }
      };
    }
  } catch (error) {
    console.error('LLM invocation failed:', error);
    throw new Error('Failed to get AI response');
  }
}

// Export the configured axios instance for direct use
export { api };

// Default export with all functions
export default {
  UploadFile,
  ExtractDataFromUploadedFile,
  InvokeLLM,
  api
};