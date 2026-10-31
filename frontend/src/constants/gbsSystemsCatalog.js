/**
 * GBS COMPANY OF MANAGEMENT SYSTEM
 * Official Catalog of all 12 Enterprise Management Systems
 * Central directory linking all independent GBS software suites.
 */

export const GBS_SYSTEMS_CATALOG = [
  {
    id: "gbs-school",
    name: "GBS School Management System",
    shortName: "School Management",
    category: "Education",
    tagline: "Total Digital Transformation for Basic, High School & University Campuses",
    description: "All-in-one institutional operating system managing admissions, multi-tier academics, grading, verified attendance, fee collection, staff HR, and parent communications.",
    problemsSolved: [
      "Eliminates lost student records, manual grading delays, and fragmented school spreadsheets",
      "Automates tuition fee reconciliation and SSNIT statutory accounting",
      "Gives parents and faculty instant transparency via dedicated portals"
    ],
    keyFeatures: [
      "Full Role Workspaces: Headmaster, Teacher, Student, Parent, Accountant, HR",
      "Master's (M1, M2) and PhD (1, 2, 3) Collegiate Curriculum Architecture",
      "Weekly Attendance Sign-Off & Headmaster Approval Gatekeeper",
      "Real-Life Authenticated Portraits & Offline Bidirectional Sync Engine"
    ],
    targetAudience: "Nursery, Primary, JHS, Senior High Schools & Universities",
    status: "LIVE & OPERATIONAL",
    launchUrl: "/login",
    onboardUrl: "/signup/institution",
    badgeColor: "#10b981",
    icon: "🎓"
  },
  {
    id: "gbs-exam",
    name: "GBS Examination & CBT Testing System",
    shortName: "CBT Examination",
    category: "Education",
    tagline: "Secure Timed Question Gating, AI Auto-Grading & Bubble Sheet OMR Scanning",
    description: "Comprehensive exam authoring and administration engine supporting both online timed CBT examinations and physical hand-marked written exam archiving.",
    problemsSolved: [
      "Prevents student exam malpractice with strict time window gating",
      "Eliminates weeks of manual script marking with automated grading and AI OMR scanners",
      "Instantly publishes verified scores directly into terminal transcripts"
    ],
    keyFeatures: [
      "Question Builder with typed document uploads and LaTeX formula support",
      "Strict Start/End Time countdown gating and anti-tab-switch sentinel",
      "Manual entry for physical written & marked exam papers",
      "Instant terminal gradebook and class percentile rankings"
    ],
    targetAudience: "Schools, Examination Boards, Colleges & Certification Centers",
    status: "LIVE MODULE",
    launchUrl: "/portal/teacher/dashboard?tab=exams",
    onboardUrl: "/signup/institution",
    badgeColor: "#38bdf8",
    icon: "📝"
  },
  {
    id: "gbs-supermarket",
    name: "GBS Supermarket & Retail POS System",
    shortName: "Supermarket & POS",
    category: "Retail & Commerce",
    tagline: "High-Speed Barcode Checkout, Multi-Branch Inventory & Profit Audit",
    description: "Enterprise point-of-sale and supply-chain management software designed for supermarkets, grocery chains, wholesale depots, and retail outlets.",
    problemsSolved: [
      "Stops inventory theft and undetected shelf shortages through real-time stock deductions",
      "Prevents cashier register discrepancies with end-of-shift drawer reconciliation",
      "Automates supplier purchase orders when inventory reaches safety thresholds"
    ],
    keyFeatures: [
      "Millisecond barcode scanning and thermal receipt printer integration",
      "Multi-store branch synchronization and warehouse transfers",
      "Batch expiration date alerts to prevent selling expired goods",
      "Instant profit margin analytics and sales tax reporting"
    ],
    targetAudience: "Supermarkets, Department Stores, Wholesalers & Retail Chains",
    status: "READY FOR DEPLOYMENT",
    launchUrl: "https://supermarket.gbscompany.com",
    onboardUrl: "/signup",
    badgeColor: "#f59e0b",
    icon: "🛒"
  },
  {
    id: "gbs-loan",
    name: "GBS Microfinance & Loan Management System",
    shortName: "Loan Management",
    category: "Financial Services",
    tagline: "Automated Credit Scoring, Collateral Vault & Repayment Amortization",
    description: "End-to-end lending and portfolio management platform for microfinance institutions, credit unions, money lenders, and investment clubs.",
    problemsSolved: [
      "Minimizes loan default rates with systematic borrower credit risk assessment",
      "Eliminates calculation errors on compound interest and late penalty fees",
      "Automates SMS and email collection reminders before due dates"
    ],
    keyFeatures: [
      "Flexible amortization schedule generator (Reducing Balance & Flat Rate)",
      "Digital collateral custody vault with photo upload and valuation logs",
      "Borrower KYC biometric facial matching and national ID verification",
      "Disbursement tracking via Mobile Money (MoMo) and Bank API integration"
    ],
    targetAudience: "Microfinance Banks, Credit Unions, SACCOs & Money Lenders",
    status: "READY FOR DEPLOYMENT",
    launchUrl: "/loans/dashboard",
    onboardUrl: "/signup",
    badgeColor: "#8b5cf6",
    icon: "💰"
  },
  {
    id: "gbs-hospital",
    name: "GBS Hospital & Clinical Management System",
    shortName: "Hospital & Clinics",
    category: "Healthcare",
    tagline: "Electronic Medical Records, Outpatient Triage & Inpatient Ward Telemetry",
    description: "Complete clinical operating platform connecting reception, outpatient triage, doctors' consultation rooms, laboratory testing, and inpatient wards.",
    problemsSolved: [
      "Ends missing patient paper folders with instant digital EMR search",
      "Prevents dangerous prescription drug interactions through automated alerts",
      "Streamlines health insurance claim billing and cash reconciliation"
    ],
    keyFeatures: [
      "Electronic Health Records (EHR) with medical history and ICD-10 coding",
      "Doctor appointment scheduling and live queue management displays",
      "Laboratory diagnostic test ordering and digital result dispatch",
      "Bed management, nursing station rounds, and emergency triage priority"
    ],
    targetAudience: "Hospitals, Clinics, Diagnostic Centers & Maternity Homes",
    status: "IN DEVELOPMENT",
    launchUrl: "https://hospital.gbscompany.com",
    onboardUrl: "/signup",
    badgeColor: "#06b6d4",
    icon: "🏥"
  },
  {
    id: "gbs-pharmacy",
    name: "GBS Pharmacy & Dispensary Management System",
    shortName: "Pharmacy & Dispensary",
    category: "Healthcare & Retail",
    tagline: "Drug Expiry Sentinels, Prescription Verification & Wholesale Restocking",
    description: "Specialized pharmaceutical retail and inventory platform engineered to enforce medicine safety regulations, track batches, and manage dispensary sales.",
    problemsSolved: [
      "Protects public health by blocking the sale of expired or recalled medicines",
      "Ensures controlled substance audit trails to satisfy national drug regulators",
      "Prevents stock-outs of life-saving medicines through intelligent reorder points"
    ],
    keyFeatures: [
      "Batch and expiry date tracking with early-warning visual radar",
      "Prescription validation with doctor signature verification",
      "Fast over-the-counter (OTC) barcode billing and patient dosage labeling",
      "Direct integration with pharmaceutical wholesale suppliers"
    ],
    targetAudience: "Community Pharmacies, Hospital Dispensaries & Drug Distributors",
    status: "IN DEVELOPMENT",
    launchUrl: "https://pharmacy.gbscompany.com",
    onboardUrl: "/signup",
    badgeColor: "#14b8a6",
    icon: "💊"
  },
  {
    id: "gbs-hotel",
    name: "GBS Hotel & Hospitality Reservation System",
    shortName: "Hotel Management",
    category: "Hospitality",
    tagline: "Room Booking Engine, Guest Folio Billing & Housekeeping Dispatch",
    description: "Comprehensive front-desk and property operations software for hotels, guest lodges, beach resorts, and serviced luxury apartments.",
    problemsSolved: [
      "Eliminates double bookings across online booking platforms and walk-in guests",
      "Accelerates check-in and checkout from minutes to seconds",
      "Consolidates restaurant, bar, laundry, and room charges into one unified guest invoice"
    ],
    keyFeatures: [
      "Interactive visual room grid with occupancy status (Occupied, Dirty, Clean, Reserved)",
      "Automated guest billing folio with multi-currency and mobile payment support",
      "Housekeeping room inspection workflows with instant status updates",
      "Restaurant/Bar POS integration for room charging"
    ],
    targetAudience: "Hotels, Lodges, Resorts, Guesthouses & Serviced Apartments",
    status: "IN DEVELOPMENT",
    launchUrl: "https://hotel.gbscompany.com",
    onboardUrl: "/signup",
    badgeColor: "#ec4899",
    icon: "🏨"
  },
  {
    id: "gbs-prison",
    name: "GBS Prison & Correctional Facility Management",
    shortName: "Correctional Facilities",
    category: "Civic & Public Security",
    tagline: "Inmate Biometric Custody, Court Appearance Calendars & Sentence Audit",
    description: "Secure, tamper-resistant custodial tracking system built for correctional institutions, remand centers, and juvenile rehabilitation facilities.",
    problemsSolved: [
      "Prevents unlawful detention beyond sentence expiry through automatic date computation",
      "Stops inmate identity confusion with high-accuracy biometric facial and fingerprint records",
      "Streamlines court attendance schedules to eliminate missed hearing dates"
    ],
    keyFeatures: [
      "Biometric inmate intake, facial recognition, and physical feature recording",
      "Sentence calculation engine tracking remand, bail, and parole milestones",
      "Visitor screening registry with photo capture and relationship logs",
      "Cell block allocation, roll-call muster, and internal incident logging"
    ],
    targetAudience: "Prisons, Correctional Services, Remand Homes & Detention Centers",
    status: "IN DEVELOPMENT",
    launchUrl: "https://prison.gbscompany.com",
    onboardUrl: "/signup",
    badgeColor: "#64748b",
    icon: "🏛️"
  },
  {
    id: "gbs-transport",
    name: "GBS Fleet & Transport Logistics System",
    shortName: "Transport & Logistics",
    category: "Logistics & Transport",
    tagline: "Live Satellite GPS Telemetry, Destination Fares & Driver Scheduling",
    description: "Real-time transport coordination suite managing institutional school buses, commercial delivery fleets, passenger manifests, and route profitability.",
    problemsSolved: [
      "Gives parents and school administrators live visibility of bus locations",
      "Stops revenue loss on transport routes through automated fare calculation",
      "Reduces vehicle breakdowns through preventive maintenance scheduling"
    ],
    keyFeatures: [
      "Live GPS bus tracking and student passenger boarding manifest verification",
      "Route creator with zone-based fare structures and driver assignments",
      "Driver license, insurance, and vehicle roadworthiness expiry trackers",
      "Fuel consumption analytics and digital trip logbooks"
    ],
    targetAudience: "School Bus Fleets, Logistics Companies, Couriers & Transport Unions",
    status: "LIVE MODULE",
    launchUrl: "/portal/admin/dashboard?tab=transport",
    onboardUrl: "/signup/institution",
    badgeColor: "#f97316",
    icon: "🚌"
  },
  {
    id: "gbs-realestate",
    name: "GBS Real Estate & Property Management System",
    shortName: "Real Estate & Leasing",
    category: "Property & Assets",
    tagline: "Tenant Lease Tracking, Automated Rent Invoicing & Maintenance Tickets",
    description: "Professional property portfolio management system for real estate agencies, commercial landlords, property managers, and facility executives.",
    problemsSolved: [
      "Ends overdue rent collection delays with automated tenant payment reminders",
      "Eliminates lost tenant complaints with tracked maintenance work orders",
      "Delivers clear net-operating-income (NOI) reports to property owners"
    ],
    keyFeatures: [
      "Tenant onboarding, digital tenancy agreement archiving, and deposit registry",
      "Automated monthly/quarterly rent invoicing and automated receipt generation",
      "Maintenance request dispatch with technician assignment and cost tracking",
      "Multi-building property portfolio analytics and occupancy rate metrics"
    ],
    targetAudience: "Real Estate Agencies, Landlords, Property Managers & Estate Developers",
    status: "IN DEVELOPMENT",
    launchUrl: "https://estate.gbscompany.com",
    onboardUrl: "/signup",
    badgeColor: "#0284c7",
    icon: "🏢"
  },
  {
    id: "gbs-church",
    name: "GBS Church & Ministry Management System",
    shortName: "Church & Ministry",
    category: "Religious & Non-Profit",
    tagline: "Congregation Directory, Tithe & Offering Audits & Ministry Events",
    description: "All-in-one church administration platform managing church member databases, pastoral follow-ups, financial stewardship, and department coordination.",
    problemsSolved: [
      "Strengthens church stewardship with transparent, tamper-proof financial ledgers",
      "Prevents first-time visitors from slipping away through automated follow-up workflows",
      "Simplifies group coordination for youth, choir, men's and women's fellowships"
    ],
    keyFeatures: [
      "Member census directory with family units, baptisms, and milestone dates",
      "Tithe, pledge, welfare, and building fund contribution recording with instant SMS receipts",
      "Service attendance tracking and first-time guest follow-up pipeline",
      "Bulk SMS and announcement broadcaster to departments and cells"
    ],
    targetAudience: "Churches, Ministries, Dioceses, Parishes & Religious Organizations",
    status: "IN DEVELOPMENT",
    launchUrl: "https://church.gbscompany.com",
    onboardUrl: "/signup",
    badgeColor: "#d97706",
    icon: "⛪"
  },
  {
    id: "gbs-security",
    name: "GBS CCTV & Enterprise Security Sentinel System",
    shortName: "CCTV & Security Hub",
    category: "Security & Infrastructure",
    tagline: "Multi-Camera RTSP Streams, Perimeter Intrusion Radar & Access Logs",
    description: "Unified campus security hub connecting IP surveillance cameras, biometric turnstiles, gate visitor passes, and emergency dispatch alerts.",
    problemsSolved: [
      "Provides central command visibility across all cameras from any authorized screen",
      "Flags unauthorized perimeter intrusions and suspicious after-hours movements",
      "Maintains non-repudiable gate visitor logs with national ID capture"
    ],
    keyFeatures: [
      "Live multi-channel IP camera streaming with PTZ remote control",
      "Intrusion alarm sentinel with automatic notification to security officers",
      "Biometric turnstile integration for verified student and staff entry",
      "One-click emergency lockdown and panic beacon broadcaster"
    ],
    targetAudience: "School Campuses, Corporate Offices, Warehouses & Gated Estates",
    status: "LIVE MODULE",
    launchUrl: "/cctv/hub",
    onboardUrl: "/signup",
    badgeColor: "#dc2626",
    icon: "📹"
  }
];

export const SYSTEM_CATEGORIES = [
  "All Systems",
  "Education",
  "Retail & Commerce",
  "Healthcare",
  "Financial Services",
  "Logistics & Transport",
  "Civic & Public Security",
  "Hospitality",
  "Property & Assets",
  "Religious & Non-Profit",
  "Security & Infrastructure"
];
