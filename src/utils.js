export function createPageUrl(name) {
  const map = {
    Dashboard: '/dashboard',
    ICD10Browser: '/icd10',
    DrugDatabase: '/drugs',
    AIMapper: '/ai',
    SearchTools: '/search',
    DataManagement: '/data',
  }
  return map[name] || '/'
}