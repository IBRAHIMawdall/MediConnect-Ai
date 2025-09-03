// Entity classes for medical database
// These are placeholder implementations that will be replaced with actual API integrations

export class ICD10Code {
  constructor(data = {}) {
    this.id = data.id || null;
    this.code = data.code || '';
    this.description = data.description || '';
    this.title = data.title || data.description || '';
    this.category = data.category || '';
    this.subcategory = data.subcategory || '';
    this.specialty = data.specialty || '';
    this.keywords = Array.isArray(data.keywords) ? data.keywords : [];
    this.commonly_prescribed_drugs = Array.isArray(data.commonly_prescribed_drugs) ? data.commonly_prescribed_drugs : [];
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async getAll(filters = {}) {
    // Mock data for development (enriched to satisfy UI expectations)
    return [
      new ICD10Code({
        id: 1,
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        title: 'Type 2 diabetes mellitus without complications',
        category: 'Endocrine',
        specialty: 'Endocrinology',
        keywords: ['diabetes', 'E11.9', 'type 2'],
        commonly_prescribed_drugs: ['Metformin', 'Insulin']
      }),
      new ICD10Code({
        id: 2,
        code: 'I10',
        description: 'Essential hypertension',
        title: 'Essential hypertension',
        category: 'Cardiovascular',
        specialty: 'Cardiology',
        keywords: ['hypertension', 'I10', 'blood pressure'],
        commonly_prescribed_drugs: ['Lisinopril', 'Amlodipine']
      }),
      new ICD10Code({
        id: 3,
        code: 'J44.1',
        description: 'Chronic obstructive pulmonary disease with acute exacerbation',
        title: 'COPD with acute exacerbation',
        category: 'Respiratory',
        specialty: 'Pulmonology',
        keywords: ['COPD', 'J44.1', 'exacerbation'],
        commonly_prescribed_drugs: ['Albuterol', 'Prednisone']
      })
    ];
  }

  static async search(query) {
    const all = await this.getAll();
    return all.filter(code =>
      (code.code || '').toLowerCase().includes((query || '').toLowerCase()) ||
      (code.description || '').toLowerCase().includes((query || '').toLowerCase()) ||
      (code.title || '').toLowerCase().includes((query || '').toLowerCase())
    );
  }

  static async findById(id) {
    const all = await this.getAll();
    return all.find(code => code.id === id);
  }

  // Added to match UI usage
  static async list(sort = '-created_date', limit = 100) {
    const all = await this.getAll();
    const items = Array.isArray(all) ? all : [];
    const result = items.slice(0, typeof limit === 'number' ? limit : items.length);
    return result;
  }

  // Added to match UI usage
  static async update(id, data) {
    const existing = await this.findById(id);
    return new ICD10Code({ ...(existing || {}), ...(data || {}), id });
  }

  // Added to match UI usage in data management
  static schema() {
    return {
      fields: [
        { name: 'code', type: 'string', required: true },
        { name: 'title', type: 'string', required: true },
        { name: 'category', type: 'string' },
        { name: 'specialty', type: 'string' },
        { name: 'keywords', type: 'array' },
        { name: 'commonly_prescribed_drugs', type: 'array' },
        { name: 'notes', type: 'string' }
      ]
    };
  }

  static async create(data) {
    return new ICD10Code({ ...data, id: Date.now() });
  }

  static async bulkCreate(dataArray) {
    return dataArray.map(data => new ICD10Code({ ...data, id: Date.now() + Math.random() }));
  }

  async save() {
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    return true;
  }
}

export class Drug {
  constructor(data = {}) {
    this.id = data.id || null;
    this.name = data.name || '';
    this.genericName = data.genericName || data.generic_name || '';
    this.brandName = data.brandName || '';
    this.dosage = data.dosage || '';
    this.form = data.form || '';
    this.manufacturer = data.manufacturer || '';
    this.category = data.category || '';
    this.indication = data.indication || '';
    this.contraindications = data.contraindications || '';
    this.sideEffects = data.sideEffects || '';
    this.interactions = data.interactions || '';
    this.price = data.price || 0;
    this.availability = data.availability || 'available';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();

    // Fields expected by UI (snake_case)
    this.generic_name = data.generic_name || data.genericName || '';
    this.brand_names = Array.isArray(data.brand_names)
      ? data.brand_names
      : (data.brandName ? [data.brandName] : []);
    this.drug_class = data.drug_class || data.category || '';
    this.mechanism_of_action = data.mechanism_of_action || '';
    this.indications = Array.isArray(data.indications)
      ? data.indications
      : (data.indication ? [data.indication] : []);
    this.icd10_codes = Array.isArray(data.icd10_codes) ? data.icd10_codes : [];
    this.strength = data.strength || data.dosage || '';
  }

  static async getAll(filters = {}) {
    // Mock data for development (enriched to satisfy UI expectations)
    return [
      new Drug({
        id: 1,
        name: 'Metformin',
        genericName: 'Metformin HCl',
        brandName: 'Glucophage',
        dosage: '500mg',
        form: 'Tablet',
        manufacturer: 'Bristol-Myers Squibb',
        category: 'Antidiabetic',
        indication: 'Type 2 diabetes mellitus',
        price: 25.99,
        brand_names: ['Glucophage'],
        drug_class: 'Antidiabetic',
        mechanism_of_action: 'Decreases hepatic glucose production and increases insulin sensitivity',
        indications: ['Type 2 diabetes mellitus'],
        icd10_codes: ['E11.9']
      }),
      new Drug({
        id: 2,
        name: 'Lisinopril',
        genericName: 'Lisinopril',
        brandName: 'Prinivil',
        dosage: '10mg',
        form: 'Tablet',
        manufacturer: 'Merck',
        category: 'ACE Inhibitor',
        indication: 'Hypertension',
        price: 15.50,
        brand_names: ['Prinivil', 'Zestril'],
        drug_class: 'ACE Inhibitor',
        mechanism_of_action: 'Inhibits angiotensin-converting enzyme resulting in decreased angiotensin II',
        indications: ['Hypertension', 'Heart failure'],
        icd10_codes: ['I10']
      }),
      new Drug({
        id: 3,
        name: 'Albuterol',
        genericName: 'Albuterol sulfate',
        brandName: 'Ventolin',
        dosage: '90mcg',
        form: 'Inhaler',
        manufacturer: 'GlaxoSmithKline',
        category: 'Bronchodilator',
        indication: 'Asthma, COPD',
        price: 45.00,
        brand_names: ['Ventolin', 'ProAir'],
        drug_class: 'Bronchodilator',
        mechanism_of_action: 'Beta-2 agonist causing bronchodilation',
        indications: ['Asthma', 'COPD'],
        icd10_codes: ['J44.1']
      })
    ];
  }

  static async search(query) {
    const all = await this.getAll();
    return all.filter(drug =>
      (drug.name || '').toLowerCase().includes((query || '').toLowerCase()) ||
      (drug.genericName || '').toLowerCase().includes((query || '').toLowerCase()) ||
      (drug.brandName || '').toLowerCase().includes((query || '').toLowerCase()) ||
      (drug.generic_name || '').toLowerCase().includes((query || '').toLowerCase())
    );
  }

  static async findById(id) {
    const all = await this.getAll();
    return all.find(drug => drug.id === id);
  }

  // Added to match UI usage
  static async list(sort = '-created_date', limit = 100) {
    const all = await this.getAll();
    const items = Array.isArray(all) ? all : [];
    const result = items.slice(0, typeof limit === 'number' ? limit : items.length);
    return result;
  }

  // Added to match UI usage
  static async update(id, data) {
    const existing = await this.findById(id);
    return new Drug({ ...(existing || {}), ...(data || {}), id });
  }

  // Added to match UI usage in data management
  static schema() {
    return {
      fields: [
        { name: 'generic_name', type: 'string', required: true },
        { name: 'brand_names', type: 'array' },
        { name: 'drug_class', type: 'string' },
        { name: 'mechanism_of_action', type: 'string' },
        { name: 'indications', type: 'array' },
        { name: 'icd10_codes', type: 'array' }
      ]
    };
  }

  static async create(data) {
    return new Drug({ ...data, id: Date.now() });
  }

  static async bulkCreate(dataArray) {
    return dataArray.map(data => new Drug({ ...data, id: Date.now() + Math.random() }));
  }

  async save() {
    this.updatedAt = new Date();
    return this;
  }

  async delete() {
    return true;
  }
}

// Export default for convenience
export default { ICD10Code, Drug };