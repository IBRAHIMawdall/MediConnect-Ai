// Entity classes for medical database
// These are placeholder implementations that will be replaced with actual API integrations

export class ICD10Code {
  constructor(data = {}) {
    this.id = data.id || null;
    this.code = data.code || '';
    this.description = data.description || '';
    this.category = data.category || '';
    this.subcategory = data.subcategory || '';
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  static async getAll(filters = {}) {
    // Mock data for development
    return [
      new ICD10Code({ id: 1, code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine' }),
      new ICD10Code({ id: 2, code: 'I10', description: 'Essential hypertension', category: 'Cardiovascular' }),
      new ICD10Code({ id: 3, code: 'J44.1', description: 'Chronic obstructive pulmonary disease with acute exacerbation', category: 'Respiratory' })
    ];
  }

  static async search(query) {
    const all = await this.getAll();
    return all.filter(code => 
      code.code.toLowerCase().includes(query.toLowerCase()) ||
      code.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  static async findById(id) {
    const all = await this.getAll();
    return all.find(code => code.id === id);
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
    this.genericName = data.genericName || '';
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
  }

  static async getAll(filters = {}) {
    // Mock data for development
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
        price: 25.99
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
        price: 15.50
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
        price: 45.00
      })
    ];
  }

  static async search(query) {
    const all = await this.getAll();
    return all.filter(drug => 
      drug.name.toLowerCase().includes(query.toLowerCase()) ||
      drug.genericName.toLowerCase().includes(query.toLowerCase()) ||
      drug.brandName.toLowerCase().includes(query.toLowerCase())
    );
  }

  static async findById(id) {
    const all = await this.getAll();
    return all.find(drug => drug.id === id);
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