// Shared demonstration lookups and formatters used across all module demo data.
// All values here are illustrative and clearly NOT live operational records.

export const branches = [
  { id: 'br-1', code: 'HQ-ACC', name: 'Accra Head Office', type: 'HeadOffice', path: '/HQ-ACC/' },
  { id: 'br-2', code: 'REG-TEMA', name: 'Tema Industrial Region', type: 'Region', path: '/HQ-ACC/REG-TEMA/' },
  { id: 'br-3', code: 'OUT-TEM-01', name: 'Tema Port Maintenance Workshop', type: 'Outlet', path: '/HQ-ACC/REG-TEMA/OUT-TEM-01/' },
  { id: 'br-4', code: 'REG-KUMASI', name: 'Kumasi Regional Hub', type: 'Region', path: '/HQ-ACC/REG-KUMASI/' },
  { id: 'br-5', code: 'OUT-KMS-01', name: 'Kumasi Central Plant Room', type: 'Outlet', path: '/HQ-ACC/REG-KUMASI/OUT-KMS-01/' },
  { id: 'br-6', code: 'BRN-TAK', name: 'Takoradi Branch', type: 'Branch', path: '/HQ-ACC/BRN-TAK/' },
] as const;

export const departments = [
  { id: 'dp-1', code: 'ENG', name: 'Engineering & Maintenance' },
  { id: 'dp-2', code: 'HSE', name: 'Health, Safety & Environment' },
  { id: 'dp-3', code: 'OPS', name: 'Operations' },
  { id: 'dp-4', code: 'FAC', name: 'Facilities Management' },
  { id: 'dp-5', code: 'LOG', name: 'Logistics & Stores' },
  { id: 'dp-6', code: 'FIN', name: 'Finance & Procurement' },
] as const;

export const technicians = [
  { id: 'tc-1', name: 'Kwesi Mensah', role: 'Senior HVAC Technician', team: 'HVAC Specialist Group', skills: ['HVAC', 'Refrigeration', 'BMS'] },
  { id: 'tc-2', name: 'Samuel Osei', role: 'Electrical Lead', team: 'Electrical Team', skills: ['Electrical', 'Generators', 'Switchgear'] },
  { id: 'tc-3', name: 'Emmanuel Ansah', role: 'Mechanical Fitter', team: 'Mechanical Crew', skills: ['Pumps', 'Boilers', 'Hydraulics'] },
  { id: 'tc-4', name: 'Akosua Boateng', role: 'Plumbing Technician', team: 'Plumbing & HVAC Team', skills: ['Plumbing', 'Water Systems'] },
  { id: 'tc-5', name: 'Daniel Adjei', role: 'Life Safety Technician', team: 'Life Safety Team', skills: ['Fire Systems', 'Emergency Lighting'] },
  { id: 'tc-6', name: 'Grace Owusu', role: 'Calibration Technician', team: 'Instrumentation Team', skills: ['Calibration', 'Instrumentation'] },
] as const;

export const failureCodes = [
  { code: 'FC-ELC-01', description: 'Electrical — breaker trip / overload', category: 'Electrical' },
  { code: 'FC-MEC-02', description: 'Mechanical — seal leak / bearing wear', category: 'Mechanical' },
  { code: 'FC-HVC-03', description: 'HVAC — refrigerant low / coil fouling', category: 'HVAC' },
  { code: 'FC-PMP-04', description: 'Pump — cavitation / impeller damage', category: 'Mechanical' },
  { code: 'FC-GEN-05', description: 'Generator — starting failure / low oil', category: 'Electrical' },
  { code: 'FC-PMB-06', description: 'Preventive — scheduled service', category: 'Preventive' },
] as const;

export const assetCategories = [
  'HVAC',
  'Electrical',
  'Mechanical',
  'Plumbing',
  'Fire & Safety',
  'Transport',
  'Medical Equipment',
  'IT & Communications',
  'Building Fabric',
  'Production',
] as const;

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
export function formatGhs(amount: number, decimals = 0): string {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-GH').format(value);
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function formatDate(iso: string): string {
  // Accept either ISO strings or pre-formatted labels like "Nov 5, 2026".
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('en-GH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function relativeFromNow(iso: string): string {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const diffMs = parsed.getTime() - Date.now();
  const days = Math.round(diffMs / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `In ${days} days`;
}

export function pct(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}
