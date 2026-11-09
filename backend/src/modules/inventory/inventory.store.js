'use strict';

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.resolve(__dirname, '../../../data/gbs_inventory_store.json');

const DEFAULT_ITEMS = [
  {
    id: 1,
    tenant_id: 1,
    item_code: 'INV-LAB-101',
    name: 'Science Chemistry Glassware & Beakers (Borosilicate 500ml)',
    category: 'LAB_SUPPLIES',
    unit: 'SETS',
    quantity_on_hand: 45,
    reorder_level: 15,
    unit_price: 35.0,
    location: 'Science Storeroom B1',
    status: 'IN_STOCK',
    purchased_by_staff: 'Dr. Evelyn Reed (Head of Sciences)',
    purchaser_dept: 'Faculty of Sciences',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    tenant_id: 1,
    item_code: 'INV-STA-202',
    name: 'A4 Printing & Examination Ream Paper (80gsm, 500 Sheets)',
    category: 'STATIONERY',
    unit: 'BOXES',
    quantity_on_hand: 120,
    reorder_level: 25,
    unit_price: 52.0,
    location: 'Central Logistics Depot - Rack 4',
    status: 'IN_STOCK',
    purchased_by_staff: 'Mr. Samuel Adjei (Procurement Officer)',
    purchaser_dept: 'Procurement & Logistics',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    tenant_id: 1,
    item_code: 'INV-TXT-303',
    name: 'Official Core Mathematics Curriculum Textbooks Grade 9',
    category: 'TEXTBOOKS',
    unit: 'COPIES',
    quantity_on_hand: 80,
    reorder_level: 20,
    unit_price: 65.0,
    location: 'Library Reserve Annex',
    status: 'IN_STOCK',
    purchased_by_staff: 'Mrs. Abigail Mensah (Senior Librarian)',
    purchaser_dept: 'Library & Information Services',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    tenant_id: 1,
    item_code: 'INV-ICT-404',
    name: 'Computer Lab Wireless Optical Mice & Keyboards Set',
    category: 'IT_EQUIPMENT',
    unit: 'UNITS',
    quantity_on_hand: 30,
    reorder_level: 10,
    unit_price: 45.0,
    location: 'STEM & Robotics Lab 2',
    status: 'IN_STOCK',
    purchased_by_staff: 'Eng. Marcus Thorne (ICT Director)',
    purchaser_dept: 'ICT & Educational Technology',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 5,
    tenant_id: 1,
    item_code: 'INV-MED-505',
    name: 'Clinical First Aid Antiseptic Solution & Sterile Bandages',
    category: 'FIRST_AID',
    unit: 'KITS',
    quantity_on_hand: 8,
    reorder_level: 12,
    unit_price: 22.0,
    location: 'Campus Health Clinic & Infirmary',
    status: 'LOW_STOCK',
    purchased_by_staff: 'Nurse Grace Ofori (Campus Nurse)',
    purchaser_dept: 'Health & Medical Services',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    tenant_id: 1,
    item_code: 'INV-SPO-606',
    name: 'FIFA Standard Match Leather Footballs & Referee Whistles',
    category: 'SPORTS',
    unit: 'PIECES',
    quantity_on_hand: 25,
    reorder_level: 8,
    unit_price: 90.0,
    location: 'Sports Pavilion Room 1',
    status: 'IN_STOCK',
    purchased_by_staff: 'Coach Kwesi Boateng (Sports Director)',
    purchaser_dept: 'Physical Education & Athletics',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 7,
    tenant_id: 1,
    item_code: 'INV-CLE-707',
    name: 'Industrial Hospital Grade Disinfectant & Surface Cleaner (5L)',
    category: 'CLEANING',
    unit: 'GALLONS',
    quantity_on_hand: 4,
    reorder_level: 10,
    unit_price: 32.0,
    location: 'Janitorial & Facilities Depot',
    status: 'LOW_STOCK',
    purchased_by_staff: 'Mr. Joseph Darko (Facilities Supervisor)',
    purchaser_dept: 'Campus Operations & Maintenance',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_REQUESTS = [
  {
    id: 1,
    tenant_id: 1,
    request_number: 'REQ-2026-101',
    item_id: 2,
    item_name: 'A4 Printing & Examination Ream Paper (80gsm, 500 Sheets)',
    requester_id: 1,
    requester_name: 'Mr. Samuel Adjei (Procurement Officer)',
    department: 'ACADEMIC',
    quantity_requested: 50,
    urgency: 'HIGH',
    status: 'PENDING',
    unit_price: 52.0,
    total_estimated_cost: 2600.0,
    notes: 'Urgent restocking for Mid-Term and Final Term examination papers printing.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    tenant_id: 1,
    request_number: 'REQ-2026-102',
    item_id: 5,
    item_name: 'Clinical First Aid Antiseptic Solution & Sterile Bandages',
    requester_id: 2,
    requester_name: 'Nurse Grace Ofori (Campus Nurse)',
    department: 'HEALTH_SERVICES',
    quantity_requested: 15,
    urgency: 'HIGH',
    status: 'APPROVED',
    unit_price: 22.0,
    total_estimated_cost: 330.0,
    notes: 'Mandatory replenishment for sports day and science lab safety compliance.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      if (Array.isArray(data.items) && Array.isArray(data.requests)) {
        return data;
      }
    }
  } catch (_) {}

  const initial = { items: DEFAULT_ITEMS, requests: DEFAULT_REQUESTS };
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
  } catch (_) {}
  return initial;
}

function writeStore(data) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

module.exports = {
  readStore,
  writeStore
};

