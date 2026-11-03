export type IslandGroup = 'Luzon' | 'Visayas' | 'Mindanao';

export type DpwhProjectCategory =
  | 'Bridge & Marine Link'
  | 'Expressway & Bypass Road'
  | 'Flood Control & Drainage'
  | 'Tunnel & Mountain Pass'
  | 'Public Facility & Hospital';

export type DpwhProjectStatus =
  | 'On-Going Construction'
  | 'Near Completion'
  | 'Detailed Engineering';

export interface DpwhMilestone {
  label: string;
  date: string;
  completed: boolean;
}

export interface DpwhProjectDocument {
  id: string;
  title: string;
  fileType: 'PDF' | 'DOCX';
  fileSize: string;
  category: 'Contract & Award' | 'Detailed Engineering Design' | 'Environmental Compliance' | 'Progress Audit';
  publishedDate: string;
  downloadUrl: string;
}

export interface DpwhReview {
  id: string;
  projectId: string;
  projectTitle?: string;
  authorName: string;
  authorRole?: string;
  rating: number; // 1 to 5 stars
  date: string;
  comment: string;
  photos?: string[];
  tags?: string[];
  helpfulCount: number;
}

export interface DpwhProject {
  id: string;
  contractId: string;
  title: string;
  category: DpwhProjectCategory;
  islandGroup: IslandGroup;
  region: string;
  province: string;
  cityMunicipality: string;
  implementingOffice: string;
  contractor: string;
  status: DpwhProjectStatus;
  physicalProgress: number; // 0 - 100
  budgetPhp: number;
  fundingSource: string;
  startDate: string;
  targetCompletionDate: string;
  lengthOrScope: string;
  description: string;
  publicImpact: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  milestones: DpwhMilestone[];
  lastUpdated: string;
  photos?: string[];
  documents?: DpwhProjectDocument[];
  reviews?: DpwhReview[];
}

export interface DpwhCitizenReport {
  id: string;
  projectId: string;
  contractId: string;
  reporterName: string;
  observationType: 'Progress Verification' | 'Safety / Traffic Concern' | 'Flood / Drainage Issue' | 'General Inquiry';
  comment: string;
  createdAt: string;
  referenceNumber: string;
}

export const INITIAL_DPWH_PROJECTS: DpwhProject[] = [
  {
    id: 'dpwh-proj-001',
    contractId: '24Z00018-BCIB',
    title: 'Bataan–Cavite Interlink Bridge (BCIB) Iconic Marine Crossing',
    category: 'Bridge & Marine Link',
    islandGroup: 'Luzon',
    region: 'Region III / Region IV-A',
    province: 'Bataan & Cavite',
    cityMunicipality: 'Mariveles, Bataan to Naic, Cavite',
    implementingOffice: 'DPWH UPMO — Bridges Management Cluster',
    contractor: 'International Marine Civil Engineering Consortium JV',
    status: 'On-Going Construction',
    physicalProgress: 34.8,
    budgetPhp: 175600000000,
    fundingSource: 'Asian Development Bank (ADB) / AIIB / GAA',
    startDate: '2024-10-15',
    targetCompletionDate: '2029-12-30',
    lengthOrScope: '32.15 km (2 Cable-Stayed Navigation Bridges + Marine Viaducts)',
    description:
      'A 32.15-kilometer four-lane inter-island mega bridge across Manila Bay connecting Mariveles, Bataan and Naic, Cavite, featuring two cable-stayed navigation bridges (North and South Channels).',
    publicImpact: 'Cuts travel time between Bataan and Cavite from 5.5 hours to just 45 minutes and decongests Metro Manila.',
    coordinates: { lat: 14.385, lng: 120.665 },
    milestones: [
      { label: 'Detailed Engineering Design & Geotechnical Boreholes', date: '2024-06', completed: true },
      { label: 'Onshore Approach Viaduct Pile Foundation (Package 1 & 2)', date: '2025-08', completed: true },
      { label: 'Offshore Marine Pier Piling & Cofferdam Works', date: '2026-10', completed: false },
      { label: 'Cable-Stayed Pylon Erection & Deck Segment Launching', date: '2028-04', completed: false },
    ],
    lastUpdated: '2026-10-25',
  },
  {
    id: 'dpwh-proj-002',
    contractId: '23Z00104-DBCP',
    title: 'Davao City Bypass Construction Project (with 2.3 km Twin Mountain Road Tunnel)',
    category: 'Tunnel & Mountain Pass',
    islandGroup: 'Mindanao',
    region: 'Region XI (Davao Region)',
    province: 'Davao del Sur & Davao del Norte',
    cityMunicipality: 'Digos–Toril, Davao City to Panabo City',
    implementingOffice: 'DPWH UPMO — Roads Management Cluster I (Bilateral)',
    contractor: 'Shimizu–Ulticon–Takenaka Joint Venture',
    status: 'On-Going Construction',
    physicalProgress: 76.4,
    budgetPhp: 46800000000,
    fundingSource: 'JICA Official Development Assistance (ODA) & GAA',
    startDate: '2021-06-01',
    targetCompletionDate: '2027-06-30',
    lengthOrScope: '45.5 km 4-Lane Highway + 2.3 km Twin-Tube Mountain Tunnel',
    description:
      'Constructing the Philippines’ first long-distance twin-tube mountain road tunnel using New Austrian Tunneling Method (NATM) alongside a 45.5-km four-lane bypass road.',
    publicImpact: 'Reduces travel time between Toril, Davao City and Panabo City from 1 hour 44 minutes via Pan-Philippine Highway to 49 minutes.',
    coordinates: { lat: 7.145, lng: 125.542 },
    milestones: [
      { label: 'North and South Portal Excavation', date: '2022-11', completed: true },
      { label: 'Twin-Tube Mountain Tunnel Breakthrough (North & South Tubes)', date: '2025-05', completed: true },
      { label: 'Tunnel Mechanical, Ventilation, Lighting & Fire Safety Systems', date: '2026-11', completed: false },
      { label: 'Final Asphalt Paving & Intelligent Traffic System Commissioning', date: '2027-05', completed: false },
    ],
    lastUpdated: '2026-10-28',
  },
  {
    id: 'dpwh-proj-003',
    contractId: '24Z00052-SIDC',
    title: 'Samal Island–Davao City Connector (SIDC) Extradosed Bridge',
    category: 'Bridge & Marine Link',
    islandGroup: 'Mindanao',
    region: 'Region XI (Davao Region)',
    province: 'Davao del Norte & Davao del Sur',
    cityMunicipality: 'Island Garden City of Samal to Lanang, Davao City',
    implementingOffice: 'DPWH UPMO — Bridges Management Cluster',
    contractor: 'China Road and Bridge Corporation (CRBC)',
    status: 'On-Going Construction',
    physicalProgress: 64.2,
    budgetPhp: 23039000000,
    fundingSource: 'ODA Loan & Philippine Government Counterpart',
    startDate: '2023-05-01',
    targetCompletionDate: '2027-09-30',
    lengthOrScope: '3.98 km 4-Lane Extradosed Bridge (275m Main Navigation Span)',
    description:
      'A 3.98-kilometer toll-free four-lane bridge crossing Pakiputan Strait with a vertical navigation clearance of 47 meters linking Samal Island directly to Davao City.',
    publicImpact: 'Accommodates 25,000 vehicles daily and cuts crossing time from 50 minutes (including ferry queues) to 4.5 minutes.',
    coordinates: { lat: 7.112, lng: 125.661 },
    milestones: [
      { label: 'Geotechnical Survey & Environmental Protection Coral Relocation', date: '2023-12', completed: true },
      { label: 'Davao & Samal Land Approach Substructure Piling', date: '2025-04', completed: true },
      { label: 'Pakiputan Strait Main Pylon Erection', date: '2026-09', completed: true },
      { label: 'Cantilever Box Girder Deck Closure', date: '2027-06', completed: false },
    ],
    lastUpdated: '2026-10-27',
  },
  {
    id: 'dpwh-proj-004',
    contractId: '25Z00009-PMRCIP4',
    title: 'Pasig–Marikina River Channel Improvement Project (Phase IV)',
    category: 'Flood Control & Drainage',
    islandGroup: 'Luzon',
    region: 'NCR (Metro Manila)',
    province: 'Metro Manila',
    cityMunicipality: 'Pasig City, Marikina City, and Quezon City',
    implementingOffice: 'DPWH UPMO — Flood Control Management Cluster',
    contractor: 'Toyo–rotary Metro Flood Control JV',
    status: 'On-Going Construction',
    physicalProgress: 81.5,
    budgetPhp: 37900000000,
    fundingSource: 'JICA ODA & GAA Flood Management Program',
    startDate: '2022-03-10',
    targetCompletionDate: '2027-03-31',
    lengthOrScope: '7.95 km Steel Sheet Pile Revetment, Dike Elevation & Rosario Weir Upgrade',
    description:
      'Structural flood mitigation along the middle Marikina River from Manggahan Floodway to Nangka River, including steel sheet-pile revetments, parapet floodwalls, and automated floodgates.',
    publicImpact: 'Protects over 1.4 million Metro Manila residents against 30-year return-period typhoon flood surges similar to Ondoy/Carina.',
    coordinates: { lat: 14.618, lng: 121.091 },
    milestones: [
      { label: 'Channel Dredging & Riverbank Slope Stabilization', date: '2023-09', completed: true },
      { label: 'Steel Sheet Pile Driving along Pasig–Marikina Reach', date: '2025-06', completed: true },
      { label: 'Manggahan Control Gate & Rosario Weir Automation', date: '2026-08', completed: true },
      { label: 'Esplanade Linear Park & Floodwall Finishing', date: '2027-02', completed: false },
    ],
    lastUpdated: '2026-10-29',
  },
  {
    id: 'dpwh-proj-005',
    contractId: '25Z00031-PGN',
    title: 'Panay–Guimaras–Negros (PGN) Island Bridges Project (Section A: Panay–Guimaras)',
    category: 'Bridge & Marine Link',
    islandGroup: 'Visayas',
    region: 'Region VI (Western Visayas)',
    province: 'Iloilo & Guimaras',
    cityMunicipality: 'Leganes, Iloilo to Buenavista, Guimaras',
    implementingOffice: 'DPWH UPMO — Bridges Management Cluster',
    contractor: 'Korea Export-Import Bank (KEXIM) Engineering Consortium',
    status: 'On-Going Construction',
    physicalProgress: 29.0,
    budgetPhp: 57700000000,
    fundingSource: 'KEXIM EDCF ODA & GAA',
    startDate: '2025-02-01',
    targetCompletionDate: '2029-06-30',
    lengthOrScope: '13.0 km Sea-Crossing Bridge & Approach Roads (Section A)',
    description:
      'First phase of the 32.47-km inter-island link connecting Panay Island (Leganes, Iloilo) to Guimaras Island (Buenavista), enabling seamless roll-on roll-off agricultural and passenger transport across Western Visayas.',
    publicImpact: 'Reduces Iloilo-to-Guimaras crossing from 45 minutes by boat to 10 minutes all-weather highway driving.',
    coordinates: { lat: 10.761, lng: 122.615 },
    milestones: [
      { label: 'Detailed Engineering Design (DED) & Bathymetric Survey', date: '2024-11', completed: true },
      { label: 'Leganes & Buenavista Approach Road Right-of-Way Clearing', date: '2025-10', completed: true },
      { label: 'Iloilo Strait Marine Bored Piling Works', date: '2026-12', completed: false },
      { label: 'Main Span Superstructure Assembly', date: '2028-09', completed: false },
    ],
    lastUpdated: '2026-10-26',
  },
  {
    id: 'dpwh-proj-006',
    contractId: '24Z00088-CEBU4',
    title: 'Cebu–Mactan 4th Bridge and Coastal Road Construction Project',
    category: 'Bridge & Marine Link',
    islandGroup: 'Visayas',
    region: 'Region VII (Central Visayas)',
    province: 'Cebu',
    cityMunicipality: 'Mandaue City to Lapu-Lapu City (Mactan Island)',
    implementingOffice: 'DPWH UPMO — Bridges Management Cluster',
    contractor: 'Oriental Consultants Global / Metro Cebu Builders JV',
    status: 'On-Going Construction',
    physicalProgress: 48.5,
    budgetPhp: 76400000000,
    fundingSource: 'JICA ODA & GAA',
    startDate: '2024-04-15',
    targetCompletionDate: '2028-11-30',
    lengthOrScope: '3.3 km Bridge + 4.9 km Mandaue Coastal Viaduct',
    description:
      'A four-lane steel box girder bridge across the Mactan Channel paired with an elevated four-lane coastal highway in Mandaue City offering direct access to Mactan–Cebu International Airport.',
    publicImpact: 'Relieves congestion on Marcelo Fernan and Serging Osmeña bridges and cuts airport transit time by 60%.',
    coordinates: { lat: 10.335, lng: 123.959 },
    milestones: [
      { label: 'Cebu & Mactan Shore Foundation Piling', date: '2025-03', completed: true },
      { label: 'Mandaue Coastal Viaduct Pier Columns', date: '2026-04', completed: true },
      { label: 'Mactan Channel Main Steel Truss Erection', date: '2027-08', completed: false },
      { label: 'Airport Direct Ramp & Toll-Free Opening', date: '2028-11', completed: false },
    ],
    lastUpdated: '2026-10-24',
  },
  {
    id: 'dpwh-proj-007',
    contractId: '23Z00064-CLLEX2',
    title: 'Central Luzon Link Expressway (CLLEX) Phase I Extension & Phase II (Cabanatuan–San Jose)',
    category: 'Expressway & Bypass Road',
    islandGroup: 'Luzon',
    region: 'Region III (Central Luzon)',
    province: 'Nueva Ecija',
    cityMunicipality: 'Cabanatuan City, Talavera, Llanera to San Jose City',
    implementingOffice: 'DPWH UPMO — Roads Management Cluster I',
    contractor: 'Luzon Infrastructure & Highway Corp.',
    status: 'Near Completion',
    physicalProgress: 91.2,
    budgetPhp: 14200000000,
    fundingSource: 'GAA / JICA ODA',
    startDate: '2022-01-15',
    targetCompletionDate: '2027-01-31',
    lengthOrScope: '35.7 km 4-Lane High-Standard Highway',
    description:
      'High-standard toll-free expressway extending from SCTEX/TPLEX in Tarlac through Cabanatuan City toward San Jose City, Nueva Ecija, serving the agricultural rice bowl of the Philippines.',
    publicImpact: 'Cuts travel time between Tarlac City and Cabanatuan/San Jose from 90 minutes to 25 minutes.',
    coordinates: { lat: 15.486, lng: 120.967 },
    milestones: [
      { label: 'Aliaga to Caalibangbangan Interchange Opening', date: '2024-05', completed: true },
      { label: 'Cabanatuan Interchange Viaduct & Overpass', date: '2025-11', completed: true },
      { label: 'Talavera–Llanera Concrete Pavement & Guardrails', date: '2026-09', completed: true },
      { label: 'Final Road Markings, Solar Streetlights & Safety Audit', date: '2026-12', completed: false },
    ],
    lastUpdated: '2026-10-29',
  },
  {
    id: 'dpwh-proj-008',
    contractId: '25Z00044-DALTON',
    title: 'Dalton Pass East Alignment Alternative Road & Twin Mountain Tunnel',
    category: 'Tunnel & Mountain Pass',
    islandGroup: 'Luzon',
    region: 'Region II / Region III',
    province: 'Nueva Ecija & Nueva Vizcaya',
    cityMunicipality: 'Carranglan, Nueva Ecija to Aritao, Nueva Vizcaya',
    implementingOffice: 'DPWH UPMO — Roads Management Cluster I',
    contractor: 'First Balfour–Kumagai Gumi JV',
    status: 'On-Going Construction',
    physicalProgress: 26.5,
    budgetPhp: 62500000000,
    fundingSource: 'JICA ODA & GAA',
    startDate: '2025-04-01',
    targetCompletionDate: '2030-03-31',
    lengthOrScope: '23.0 km All-Weather Highway + 6.1 km Twin-Tube Mountain Tunnels',
    description:
      'Disaster-resilient alternative corridor bypassing the landslide-prone historic Dalton Pass (Daang Maharlika) connecting Central Luzon and Cagayan Valley.',
    publicImpact: 'Prevents supply-chain isolation of Cagayan Valley during typhoons and reduces heavy truck climb time by 55%.',
    coordinates: { lat: 16.128, lng: 120.945 },
    milestones: [
      { label: 'Geotechnical Core Drilling & Portal Slope Protection', date: '2025-09', completed: true },
      { label: 'Carranglan & Aritao Access Roads Construction', date: '2026-06', completed: true },
      { label: 'Tunnel Boring & NATM Excavation (6.1 km Twin Tubes)', date: '2028-10', completed: false },
      { label: 'Bridge Viaducts & Final Pavement', date: '2030-01', completed: false },
    ],
    lastUpdated: '2026-10-23',
  },
  {
    id: 'dpwh-proj-009',
    contractId: '24Z00095-CAGAYAN',
    title: 'Cagayan River Flood Management & Alcala–Tuguegarao Dike Protection System',
    category: 'Flood Control & Drainage',
    islandGroup: 'Luzon',
    region: 'Region II (Cagayan Valley)',
    province: 'Cagayan & Isabela',
    cityMunicipality: 'Tuguegarao City, Enrile, and Alcala, Cagayan',
    implementingOffice: 'DPWH Regional Office II & Flood Control Cluster',
    contractor: 'Northern Luzon Hydro & Civil Works Corp.',
    status: 'On-Going Construction',
    physicalProgress: 72.0,
    budgetPhp: 12450000000,
    fundingSource: 'GAA Build Better More Flood Resilience Fund',
    startDate: '2023-08-15',
    targetCompletionDate: '2027-04-30',
    lengthOrScope: '18.4 km Reinforced Concrete River Revetment, Spur Dikes & Magapit Channel Widening',
    description:
      'Comprehensive river-basin flood defense along the Cagayan River constriction points including Magapit Narrows widening, reinforced concrete dikes, and automated water-level telemetry.',
    publicImpact: 'Protects 68 agricultural barangays and Tuguegarao urban centers from monsoon and dam-release flooding.',
    coordinates: { lat: 17.613, lng: 121.727 },
    milestones: [
      { label: 'Magapit Narrows Sandbar Dredging (4.2M cubic meters)', date: '2024-07', completed: true },
      { label: 'Cataggaman–Enrile Concrete Revetment Wall', date: '2025-12', completed: true },
      { label: 'Alcala Flood Control Spur Dikes & Pumping Stations', date: '2026-10', completed: true },
      { label: 'Telemetry Early Warning Sensors & Dike Service Road', date: '2027-03', completed: false },
    ],
    lastUpdated: '2026-10-28',
  },
  {
    id: 'dpwh-proj-010',
    contractId: '24Z00112-ZAMBO',
    title: 'Zamboanga City By-Pass Road & East-West Coastal Viaduct Extension',
    category: 'Expressway & Bypass Road',
    islandGroup: 'Mindanao',
    region: 'Region IX (Zamboanga Peninsula)',
    province: 'Zamboanga del Sur',
    cityMunicipality: 'Culianan–Patalon, Zamboanga City',
    implementingOffice: 'DPWH Regional Office IX',
    contractor: 'Mindanao Megastructure Builders Inc.',
    status: 'Near Completion',
    physicalProgress: 89.6,
    budgetPhp: 6850000000,
    fundingSource: 'GAA 2024–2026',
    startDate: '2023-02-10',
    targetCompletionDate: '2026-12-20',
    lengthOrScope: '24.6 km 4-Lane Concrete Bypass Highway + 6 Pre-Stressed Concrete Bridges',
    description:
      'Four-lane arterial bypass linking the east and west coasts of Zamboanga City without passing through the congested downtown port and commercial district.',
    publicImpact: 'Cuts east-to-west logistics travel time across Zamboanga City from 2 hours to 35 minutes.',
    coordinates: { lat: 6.968, lng: 122.084 },
    milestones: [
      { label: 'Culianan to Cabaluay 4-Lane Opening', date: '2024-08', completed: true },
      { label: 'Lunzuran & Tumaga River Bridges Completion', date: '2025-09', completed: true },
      { label: 'Patalon West Coast Junction Concrete Paving', date: '2026-08', completed: true },
      { label: 'Slope Protection, Drainage & Solar Stud Installation', date: '2026-12', completed: false },
    ],
    lastUpdated: '2026-10-29',
  },
  {
    id: 'dpwh-proj-011',
    contractId: '25Z00077-BARMM',
    title: 'Marawi–Cotabato Peace Corridor & Narciso Ramos Highway Rehabilitation',
    category: 'Expressway & Bypass Road',
    islandGroup: 'Mindanao',
    region: 'BARMM / Region XII',
    province: 'Lanao del Sur & Maguindanao del Norte',
    cityMunicipality: 'Marawi City, Malabang, Balabagan to Sultan Kudarat',
    implementingOffice: 'DPWH UPMO — Roads Management Cluster II (Multilateral)',
    contractor: 'Al-Amanah Civil Engineering & National Builders JV',
    status: 'On-Going Construction',
    physicalProgress: 69.5,
    budgetPhp: 9400000000,
    fundingSource: 'GAA / JICA Road Network Development Project in Conflict-Affected Areas (RNDP-CAAM)',
    startDate: '2023-11-01',
    targetCompletionDate: '2027-08-15',
    lengthOrScope: '41.2 km Portland Cement Concrete Pavement (PCCP) & 5 High-Load Bridges',
    description:
      'Upgrading and widening the primary arterial trade corridor connecting Lanao del Sur and the Cotabato–Polloc Port economic zone with climate-resilient drainage and slope protection.',
    publicImpact: 'Enables direct farm-to-port transport for 350,000 residents and cuts Marawi-to-Cotabato travel time by 45 minutes.',
    coordinates: { lat: 7.625, lng: 124.142 },
    milestones: [
      { label: 'Subgrade Stabilization & Box Culvert Drainage', date: '2024-10', completed: true },
      { label: 'Malabang–Balabagan 300mm Thick Concrete Paving', date: '2026-02', completed: true },
      { label: 'Matling & Simuay River Bridge Retrofitting', date: '2026-11', completed: false },
      { label: 'Roadside Safety Barriers & Solar Lighting', date: '2027-07', completed: false },
    ],
    lastUpdated: '2026-10-26',
  },
  {
    id: 'dpwh-proj-012',
    contractId: '25Z00019-NKTI',
    title: 'UP–PGH & National Specialty Centers Seismic Retrofitting and Cancer Center Annex',
    category: 'Public Facility & Hospital',
    islandGroup: 'Luzon',
    region: 'NCR (Metro Manila)',
    province: 'Metro Manila',
    cityMunicipality: 'Ermita, Manila & Diliman, Quezon City',
    implementingOffice: 'DPWH UPMO — Buildings and Special Projects Management Cluster',
    contractor: 'Megawide–Civic Healthcare Infrastructure JV',
    status: 'On-Going Construction',
    physicalProgress: 84.0,
    budgetPhp: 8900000000,
    fundingSource: 'GAA Health Facilities Enhancement Program (HFEP)',
    startDate: '2024-01-20',
    targetCompletionDate: '2027-02-28',
    lengthOrScope: '15-Storey Specialty Hospital Building with Base-Isolation Seismic Dampers',
    description:
      'Construction of state-of-the-art public specialty medical annex equipped with high-damping rubber seismic base isolators designed to remain 100% operational immediately after a Magnitude 7.2 West Valley Fault earthquake.',
    publicImpact: 'Adds 500 Charity/PhilHealth inpatient beds and linear accelerator radiation bunkers for indigent Filipino patients.',
    coordinates: { lat: 14.578, lng: 120.985 },
    milestones: [
      { label: 'Sub-basement Excavation & Seismic Base Isolator Installation', date: '2024-12', completed: true },
      { label: '15-Storey Structural Topping-Off Ceremony', date: '2025-11', completed: true },
      { label: 'Cleanroom Operating Theaters & Medical Gas Piping', date: '2026-09', completed: true },
      { label: 'Final MEPFS Testing & DOH Turnover', date: '2027-02', completed: false },
    ],
    lastUpdated: '2026-10-29',
  },
  {
    id: 'dpwh-proj-013',
    contractId: '24H00088-MCE3',
    title: 'Metro Cebu Expressway (MCE) Segment 3 & Naga–Danao Mountain Bypass',
    category: 'Expressway & Bypass Road',
    islandGroup: 'Visayas',
    region: 'Region VII (Central Visayas)',
    province: 'Cebu',
    cityMunicipality: 'City of Naga to Danao City, Cebu',
    implementingOffice: 'DPWH Regional Office VII — Central Visayas',
    contractor: 'Cebu Mountain Corridor Infrastructure JV',
    status: 'On-Going Construction',
    physicalProgress: 64.5,
    budgetPhp: 28400000000,
    fundingSource: 'General Appropriations Act (GAA) / PPP Hybrid',
    startDate: '2023-05-12',
    targetCompletionDate: '2027-08-30',
    lengthOrScope: '56.9 km High-Standard Mountain Bypass Highway with Slope Protection',
    description:
      'A high-capacity north-south arterial mountain expressway serving as an alternative backbone to the congested Cebu Natalio Bacalso South National Highway.',
    publicImpact: 'Reduces travel time from Naga City to Danao City from 3 hours to 50 minutes across Metro Cebu.',
    coordinates: { lat: 10.285, lng: 123.825 },
    milestones: [
      { label: 'Segment 3A Mountain Cut & Rockfall Netting Installation', date: '2024-09', completed: true },
      { label: 'Minglanilla–Talisay Viaduct Pier Substructure', date: '2025-12', completed: true },
      { label: '4-Lane Concrete Roadway Paving & Drainage Channels', date: '2026-11', completed: false },
      { label: 'Highway Lighting & Traffic Safety Barrier Commissioning', date: '2027-07', completed: false },
    ],
    lastUpdated: '2026-10-28',
  },
];

// In-memory store for citizen transparency reports
const memoryCitizenReports: DpwhCitizenReport[] = [];

export interface DpwhQueryFilter {
  islandGroup?: IslandGroup | 'ALL';
  region?: string;
  category?: DpwhProjectCategory | 'ALL';
  status?: DpwhProjectStatus | 'ALL';
  search?: string;
}

export function queryDpwhProjects(filter: DpwhQueryFilter = {}) {
  let list = [...INITIAL_DPWH_PROJECTS];

  if (filter.islandGroup && filter.islandGroup !== 'ALL') {
    list = list.filter((p) => p.islandGroup === filter.islandGroup);
  }

  if (filter.region && filter.region !== 'ALL') {
    const rLower = filter.region.toLowerCase();
    list = list.filter((p) => p.region.toLowerCase().includes(rLower));
  }

  if (filter.category && filter.category !== 'ALL') {
    list = list.filter((p) => p.category === filter.category);
  }

  if (filter.status && filter.status !== 'ALL') {
    list = list.filter((p) => p.status === filter.status);
  }

  if (filter.search && filter.search.trim()) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.contractId.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.cityMunicipality.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }

  // Compute aggregate statistics across ALL projects and filtered projects
  const totalBudgetPhp = list.reduce((sum, p) => sum + p.budgetPhp, 0);
  const avgProgress =
    list.length > 0
      ? Math.round((list.reduce((sum, p) => sum + p.physicalProgress, 0) / list.length) * 10) / 10
      : 0;

  const byIsland = {
    Luzon: INITIAL_DPWH_PROJECTS.filter((p) => p.islandGroup === 'Luzon').length,
    Visayas: INITIAL_DPWH_PROJECTS.filter((p) => p.islandGroup === 'Visayas').length,
    Mindanao: INITIAL_DPWH_PROJECTS.filter((p) => p.islandGroup === 'Mindanao').length,
  };

  return {
    projects: list,
    stats: {
      totalCount: list.length,
      nationwideTotal: INITIAL_DPWH_PROJECTS.length,
      totalBudgetPhp,
      averageProgress: avgProgress,
      byIsland,
    },
  };
}

export function getDpwhProjectById(idOrContract: string): DpwhProject | null {
  const norm = idOrContract.toLowerCase().trim();
  return (
    INITIAL_DPWH_PROJECTS.find(
      (p) => p.id.toLowerCase() === norm || p.contractId.toLowerCase() === norm,
    ) || null
  );
}

export function submitDpwhCitizenReport(params: {
  projectId: string;
  reporterName: string;
  observationType: DpwhCitizenReport['observationType'];
  comment: string;
}): DpwhCitizenReport {
  const proj = getDpwhProjectById(params.projectId);
  if (!proj) {
    throw new Error(`DPWH Project not found: ${params.projectId}`);
  }
  if (!params.comment || params.comment.trim().length < 5) {
    throw new Error('Please provide a detailed observation (at least 5 characters).');
  }

  const rand = Math.floor(0x100000 + Math.random() * 0xef0000)
    .toString(16)
    .toUpperCase()
    .slice(0, 6);
  const report: DpwhCitizenReport = {
    id: `dpwh-rep-${Date.now()}-${rand}`,
    projectId: proj.id,
    contractId: proj.contractId,
    reporterName: params.reporterName.trim() || 'Anonymous Citizen',
    observationType: params.observationType,
    comment: params.comment.trim(),
    createdAt: new Date().toISOString(),
    referenceNumber: `DPWH-WATCH-2026-${rand}`,
  };

  memoryCitizenReports.unshift(report);
  return report;
}

export function listDpwhCitizenReports(projectId?: string): DpwhCitizenReport[] {
  if (!projectId) return [...memoryCitizenReports];
  return memoryCitizenReports.filter((r) => r.projectId === projectId);
}

// In-memory reviews stream (Google Reviews style)
const memoryReviews: DpwhReview[] = [
  {
    id: 'rev-001',
    projectId: 'dpwh-proj-001',
    projectTitle: 'Bataan–Cavite Interlink Bridge (BCIB)',
    authorName: 'Engr. Manuel Santos',
    authorRole: 'Resident Civil Engineer / Commuter',
    rating: 5,
    date: '3 days ago',
    comment: 'The onshore approach viaduct piling in Mariveles is visibly progressing on schedule. Marine barges are already deployed in the North Channel. This will cut our travel time to Cavite drastically.',
    photos: [
      'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Fast Construction', 'Major Infrastructure', 'On-Schedule'],
    helpfulCount: 14,
  },
  {
    id: 'rev-002',
    projectId: 'dpwh-proj-001',
    projectTitle: 'Bataan–Cavite Interlink Bridge (BCIB)',
    authorName: 'Clarissa M. Reyes',
    authorRole: 'Bataan Local Citizen',
    rating: 4,
    date: '1 week ago',
    comment: 'Road widening near Roman Superhighway is on track. Good traffic management with yellow hazard cones and marshals on site. Looking forward to the cable-stayed pylon erection!',
    photos: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Traffic Safety', 'Road Widening'],
    helpfulCount: 8,
  },
  {
    id: 'rev-003',
    projectId: 'dpwh-proj-002',
    projectTitle: 'Davao City Bypass Construction Project',
    authorName: 'Davao Commuters Coalition',
    authorRole: 'Verified Local Commuter',
    rating: 5,
    date: '2 weeks ago',
    comment: 'Tunnel boring breakthrough on the North Portal is incredible engineering! The twin mountain pass will bypass traffic in Toril and downtown Davao completely.',
    photos: [
      'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Twin Road Tunnel', 'Game Changer', 'JICA Funded'],
    helpfulCount: 22,
  },
  {
    id: 'rev-004',
    projectId: 'dpwh-proj-003',
    projectTitle: 'Samal Island–Davao City Connector (SIDC)',
    authorName: 'Atty. Rafael D. Ramos',
    authorRole: 'Samal Island Resident & Advocate',
    rating: 5,
    date: '4 days ago',
    comment: 'Dredging and pier casing works visible off the coast of Lanang. Ferry congestion is bad right now so this extradosed bridge will be a life saver for medical emergencies and workers!',
    photos: [
      'https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Island Connection', 'Tourism Boost', 'Emergency Access'],
    helpfulCount: 19,
  },
  {
    id: 'rev-005',
    projectId: 'dpwh-proj-004',
    projectTitle: 'Pasig-Marikina River Channel Improvement',
    authorName: 'Barangay Tumana Flood Committee',
    authorRole: 'Marikina Resident',
    rating: 4,
    date: '5 days ago',
    comment: 'The newly constructed reinforced flood wall and modernized pumping station held up excellently during the recent monsoon rains. We did not experience water spillover into the streets.',
    photos: [
      'https://images.unsplash.com/photo-1590486803833-1c5dc8ddd4c8?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Flood Control', 'Pumping Station', 'Community Safety'],
    helpfulCount: 31,
  },
  {
    id: 'rev-006',
    projectId: 'dpwh-proj-006',
    projectTitle: 'Cebu-Mactan 4th Bridge & Coastal Road',
    authorName: 'Lapu-Lapu City Transport Sector',
    authorRole: 'Airport Van Driver',
    rating: 5,
    date: '6 days ago',
    comment: 'Reclamation for the coastal approach road in Mandaue is underway. This 4th bridge is badly needed to relieve the Marcelo Fernan and Old Mactan bridges from Mactan airport traffic.',
    photos: [
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
    ],
    tags: ['Decongestion', 'Airport Link', 'JICA ODA'],
    helpfulCount: 17,
  },
];

export interface DpwhReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  percentages: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function getDpwhReviewSummary(projectId?: string): DpwhReviewSummary {
  const list = projectId ? memoryReviews.filter((r) => r.projectId === projectId) : memoryReviews;
  const totalReviews = list.length;
  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of list) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[star]++;
  }
  const avg =
    totalReviews > 0
      ? Math.round((list.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10) / 10
      : 5.0;
  const percentages: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: totalReviews ? Math.round((breakdown[1] / totalReviews) * 100) : 0,
    2: totalReviews ? Math.round((breakdown[2] / totalReviews) * 100) : 0,
    3: totalReviews ? Math.round((breakdown[3] / totalReviews) * 100) : 0,
    4: totalReviews ? Math.round((breakdown[4] / totalReviews) * 100) : 0,
    5: totalReviews ? Math.round((breakdown[5] / totalReviews) * 100) : 0,
  };
  return {
    averageRating: avg,
    totalReviews,
    ratingBreakdown: breakdown,
    percentages,
  };
}

export function voteHelpfulDpwhReview(reviewId: string): DpwhReview | null {
  const rev = memoryReviews.find((r) => r.id === reviewId);
  if (!rev) return null;
  rev.helpfulCount += 1;
  return rev;
}

export function submitDpwhReview(params: {
  projectId: string;
  authorName: string;
  authorRole?: string;
  rating: number;
  comment: string;
  photos?: string[];
  tags?: string[];
}): DpwhReview {
  const proj = getDpwhProjectById(params.projectId);
  if (!proj) {
    throw new Error(`DPWH Project not found: ${params.projectId}`);
  }
  if (!params.comment || params.comment.trim().length < 3) {
    throw new Error('Please write a review comment (at least 3 characters).');
  }

  const review: DpwhReview = {
    id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    projectId: proj.id,
    projectTitle: proj.title,
    authorName: params.authorName.trim() || 'Verified Citizen',
    authorRole: params.authorRole || 'Verified Commuter',
    rating: Math.min(5, Math.max(1, Math.round(params.rating || 5))),
    date: 'Just now',
    comment: params.comment.trim(),
    photos: Array.isArray(params.photos) ? params.photos : [],
    tags: Array.isArray(params.tags) ? params.tags : ['Verified Observation'],
    helpfulCount: 0,
  };

  memoryReviews.unshift(review);
  return review;
}

export function listDpwhReviews(
  queryOrProjectId?:
    | string
    | {
        projectId?: string;
        rating?: number;
        sort?: 'newest' | 'highest' | 'lowest' | 'helpful';
        hasPhotos?: boolean;
      },
): DpwhReview[] {
  let list = [...memoryReviews];
  if (typeof queryOrProjectId === 'string') {
    return list.filter((r) => r.projectId === queryOrProjectId);
  }
  if (queryOrProjectId && typeof queryOrProjectId === 'object') {
    if (queryOrProjectId.projectId) {
      list = list.filter((r) => r.projectId === queryOrProjectId.projectId);
    }
    if (queryOrProjectId.rating) {
      list = list.filter((r) => Math.round(r.rating) === queryOrProjectId.rating);
    }
    if (queryOrProjectId.hasPhotos) {
      list = list.filter((r) => Array.isArray(r.photos) && r.photos.length > 0);
    }
    if (queryOrProjectId.sort === 'highest') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (queryOrProjectId.sort === 'lowest') {
      list.sort((a, b) => a.rating - b.rating);
    } else if (queryOrProjectId.sort === 'helpful') {
      list.sort((a, b) => b.helpfulCount - a.helpfulCount);
    }
  }
  return list;
}
