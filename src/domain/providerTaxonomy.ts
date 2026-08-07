export type ProviderType = 'contractor' | 'supplier' | 'professional' | 'subcontractor' | 'consultant';

/**
 * Specialized Construction Personnel & Service Providers Matrix.
 *
 * The provider marketplace is organized into five matrix groups. Each group maps
 * onto a coarse ProviderType for backward-compatible filtering, while the
 * specialty layer carries the granular role / trade classification.
 * Material suppliers are intentionally NOT part of this matrix — they keep the
 * coarse `supplier` ProviderType only.
 */

export type ProviderCategory =
  | 'professional-consultant'
  | 'general-contractor'
  | 'subcontracting-firm'
  | 'skilled-artisan'
  | 'testing-qa';

export interface ProviderCategoryInfo {
  value: ProviderCategory;
  label: string;
  shortLabel: string;
  description: string;
}

export const PROVIDER_CATEGORIES: ProviderCategoryInfo[] = [
  {
    value: 'professional-consultant',
    label: 'Professional Consultants & Technical Engineers',
    shortLabel: 'Consultants',
    description: 'Feasibility, design, structural integrity, regulatory compliance, financial control, and overall project governance.',
  },
  {
    value: 'general-contractor',
    label: 'Main & General Contractors',
    shortLabel: 'General Contractors',
    description: 'Turnkey execution firms responsible for project coordination, safety, timeline adherence, and managing sub-contracted trades.',
  },
  {
    value: 'subcontracting-firm',
    label: 'Specialized Subcontracting Firms',
    shortLabel: 'Subcontractors',
    description: 'Trade-specific firms executing specialized technical packages requiring distinct machinery, certifications, or niche installation techniques.',
  },
  {
    value: 'skilled-artisan',
    label: 'Skilled Artisans & On-Site Tradespeople',
    shortLabel: 'Artisans & Trades',
    description: 'The core operational workforce delivering direct labour and trade execution on site.',
  },
  {
    value: 'testing-qa',
    label: 'Independent Testing & Quality Assurance Services',
    shortLabel: 'Testing & QA',
    description: 'Independent verification, material testing, surveying, and quality assurance services.',
  },
];

export interface ProviderSpecialtyInfo {
  value: ProviderSpecialty;
  label: string;
  description: string;
  trades?: string[];
}

export type ProviderSpecialty =
  // 1. Professional Consultants & Technical Engineers
  | 'quantity-surveyor'
  | 'civil-structural-engineer'
  | 'architect-spatial-designer'
  | 'mep-engineer'
  | 'geotechnical-engineer'
  | 'project-construction-manager'
  | 'hse-officer'
  // 2. Main & General Contractors
  | 'general-building-contractor'
  | 'civil-infrastructure-contractor'
  | 'design-build-turnkey-contractor'
  // 3. Specialized Subcontracting Firms
  | 'structural-earthworks'
  | 'facade-fenestration'
  | 'specialist-mechanical-hvac'
  | 'renewable-energy-high-voltage'
  | 'finishing-fit-out'
  | 'protection-waterproofing'
  | 'specialist-systems-automation'
  // 4. Skilled Artisans & On-Site Tradespeople
  | 'civil-structural-trade'
  | 'mep-trade'
  | 'interior-exterior-finishing'
  | 'heavy-equipment-plant'
  // 5. Independent Testing & Quality Assurance Services
  | 'material-testing-laboratory'
  | 'land-topographic-surveyor'
  | 'acoustic-thermal-consultant';

export const PROVIDER_SPECIALTIES: Record<ProviderCategory, ProviderSpecialtyInfo[]> = {
  'professional-consultant': [
    { value: 'quantity-surveyor', label: 'Quantity Surveyor & Budget Engineer', description: 'Cost planning, Bill of Quantities (BOQ) preparation, tender documentation, value engineering, interim valuations, and final account settlements.' },
    { value: 'civil-structural-engineer', label: 'Civil & Structural Engineer', description: 'Structural calculations, load-bearing design, foundation engineering, reinforced concrete detailing, structural steel frameworks, and site infrastructure.' },
    { value: 'architect-spatial-designer', label: 'Architect & Spatial Designer', description: 'Conceptual design, spatial planning, 3D visualization/BIM modeling, planning authority submissions, and working construction drawings.' },
    { value: 'mep-engineer', label: 'MEP Engineer', description: 'High-and-low voltage layout design, HVAC system sizing, drainage and water supply schematics, and renewable energy (solar/PV) integration.' },
    { value: 'geotechnical-engineer', label: 'Geotechnical Engineer & Soil Scientist', description: 'Borehole drilling, soil load-bearing capacity testing, compaction reports, and slope/foundation stabilization strategies.' },
    { value: 'project-construction-manager', label: 'Project & Construction Manager (PM/CM)', description: 'Schedule administration, quality assurance, procurement oversight, risk mitigation, and client representation.' },
    { value: 'hse-officer', label: 'Health, Safety & Environmental (HSE) Officer', description: 'Site safety audits, Environmental Impact Assessments (EIA), hazard identification, and regulatory safety compliance.' },
  ],
  'general-contractor': [
    { value: 'general-building-contractor', label: 'General Building Contractor', description: 'Manages total site operations, structural construction, superstructure, and interior/exterior completions under a unified contract.' },
    { value: 'civil-infrastructure-contractor', label: 'Civil Infrastructure Contractor', description: 'Heavy earthworks, road construction, deep foundations, bulk water supply, stormwater drainage, and municipal services.' },
    { value: 'design-build-turnkey-contractor', label: 'Design-Build Turnkey Contractor', description: 'Integrated design and construction under one entity to streamline communication and speed up delivery.' },
  ],
  'subcontracting-firm': [
    { value: 'structural-earthworks', label: 'Structural & Earthworks', description: 'Excavation, piling, underpinning, pre-stressed/post-tensioned concrete, and structural steel fabrication/erection.' },
    { value: 'facade-fenestration', label: 'Facade & Fenestration', description: 'Architectural aluminum fitting, curtain wall installations, glass glazing, metal wall clad panel systems, and dynamic canopies.' },
    { value: 'specialist-mechanical-hvac', label: 'Specialist Mechanical & HVAC', description: 'Central air conditioning, chiller plants, ducting installation, ventilation systems, and medical gas piping.' },
    { value: 'renewable-energy-high-voltage', label: 'Renewable Energy & High Voltage', description: 'Solar PV array installations, industrial generator backup, transformer installation, and main distribution board (MDB) assembly.' },
    { value: 'finishing-fit-out', label: 'Finishing & Fit-Out', description: 'Specialized acoustic drywalling, suspended ceilings, epoxy flooring, high-end millwork, and joinery.' },
    { value: 'protection-waterproofing', label: 'Protection & Waterproofing', description: 'Foundation tanking, flat roof membrane installation, damp proofing, and passive fire stopping/fireproofing.' },
    { value: 'specialist-systems-automation', label: 'Specialist Systems & Automation', description: 'Building Management Systems (BMS), CCTV, access control, perimeter security, and smart home/office integration.' },
  ],
  'skilled-artisan': [
    {
      value: 'civil-structural-trade',
      label: 'Civil & Structural Trades',
      description: 'Direct labour for concrete structure and masonry.',
      trades: ['Steel Fixers', 'Shuttering Carpenters / Formwork Specialists', 'Masons & Bricklayers', 'Concrete Finishers'],
    },
    {
      value: 'mep-trade',
      label: 'Mechanical, Electrical & Plumbing Trades',
      description: 'Installation and servicing of building services on site.',
      trades: ['Certified Electricians', 'Plumbers & Pipefitters', 'HVAC Technicians'],
    },
    {
      value: 'interior-exterior-finishing',
      label: 'Interior & Exterior Finishing Trades',
      description: 'Finishes, glazing, coatings, and joinery execution.',
      trades: ['Aluminium Fabricators & Glaziers', 'Plasterers & Drywall Installers', 'Tilers & Flooring Artisans', 'Painters & Coating Specialists', 'Joiners & Cabinetmakers'],
    },
    {
      value: 'heavy-equipment-plant',
      label: 'Heavy Equipment & Plant Operators',
      description: 'Earthmoving machinery operation and certified lifting.',
      trades: ['Earthmoving Operators', 'Lifting Operators (mobile/tower cranes) & Certified Riggers/Banksmen'],
    },
  ],
  'testing-qa': [
    { value: 'material-testing-laboratory', label: 'Material Testing Laboratory', description: 'Concrete cube compression testing, soil compaction (Proctor) tests, steel tensile testing, and aggregate grading.' },
    { value: 'land-topographic-surveyor', label: 'Land & Topographic Surveyor', description: 'Boundary verification, site leveling, setting out grid lines, and drone aerial surveys.' },
    { value: 'acoustic-thermal-consultant', label: 'Acoustic & Thermal Consultant', description: 'Insulation audits, soundproofing verification, and thermal imaging diagnostics.' },
  ],
};

/** Coarse filter type derived from a matrix category (never 'supplier'). */
export const providerTypeForCategory = (category: ProviderCategory): ProviderType => {
  switch (category) {
    case 'professional-consultant':
      return 'professional';
    case 'general-contractor':
      return 'contractor';
    case 'subcontracting-firm':
    case 'skilled-artisan':
      return 'subcontractor';
    case 'testing-qa':
      return 'consultant';
  }
};

/** Reverse mapping — legacy providers carrying only a coarse type may not have a category. */
export const providerCategoryForType = (type: ProviderType): ProviderCategory | undefined => {
  switch (type) {
    case 'professional':
      return 'professional-consultant';
    case 'contractor':
      return 'general-contractor';
    case 'subcontractor':
      return 'subcontracting-firm';
    case 'consultant':
      return 'testing-qa';
    default:
      return undefined;
  }
};

export const specialtiesForCategory = (category: ProviderCategory | undefined): ProviderSpecialtyInfo[] =>
  category ? PROVIDER_SPECIALTIES[category] : [];

export const specialtyInfo = (value: ProviderSpecialty): ProviderSpecialtyInfo | undefined =>
  ALL_SPECIALTIES.find((s) => s.value === value);

export const specialtyLabel = (value: ProviderSpecialty): string =>
  specialtyInfo(value)?.label ?? value;

export const categoryInfo = (value: ProviderCategory | undefined): ProviderCategoryInfo | undefined =>
  PROVIDER_CATEGORIES.find((c) => c.value === value);

export const categoryLabel = (value: ProviderCategory | undefined): string =>
  categoryInfo(value)?.label ?? 'Uncategorised';

export interface FlatSpecialty extends ProviderSpecialtyInfo {
  category: ProviderCategory;
}

export const ALL_SPECIALTIES: FlatSpecialty[] = PROVIDER_CATEGORIES.flatMap((c) =>
  PROVIDER_SPECIALTIES[c.value].map((s) => ({ ...s, category: c.value })),
);
