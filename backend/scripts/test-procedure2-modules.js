'use strict';

const prisma = require('../src/core/database/prisma.client');
const libraryService = require('../src/modules/library/library.service');
const transportService = require('../src/modules/transport/transport.service');
const inventoryService = require('../src/modules/inventory/inventory.service');
const hrService = require('../src/modules/hr/hr.service');
const aiExamService = require('../src/modules/ai-exam/aiExam.service');

async function runProcedure2Tests() {
  console.log('================================================================================');
  console.log('   GBS ENTERPRISE - PROCEDURE 2 VERIFICATION TEST SUITE                        ');
  console.log('   LIBRARY, TRANSPORT, INVENTORY, HR & AI EXAM SCANNER                         ');
  console.log('================================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, description) {
    if (condition) {
      console.log(`  ✅ PASS: ${description}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${description}`);
      failed++;
    }
  }

  // Find a valid user in Tenant 1 for reference tests
  const validUser = await prisma.user.findFirst({ where: { tenantId: 1 } });
  const testUserId = validUser ? validUser.id : null;

  // 1. Library Management Tests
  console.log('[1/5] Testing Library Management Engine (PostgreSQL)...');
  const libStats = await libraryService.getStats(1);
  assert(libStats.success && libStats.data.totalTitles > 0, `Library stats operational (Titles: ${libStats.data?.totalTitles})`);

  const booksResult = await libraryService.getBooks(1, 'Effective');
  assert(booksResult.success && booksResult.data.records.length > 0, `Search books by keyword returned ${booksResult.data?.records.length} matches`);

  const sampleBook = booksResult.data.records[0];
  const borrowRes = await libraryService.borrowBook({
    bookId: sampleBook.id,
    borrowerId: testUserId,
    borrowerName: 'Test Student',
    borrowerRole: 'STUDENT',
    dueDays: 14
  }, 1);
  assert(borrowRes.success && borrowRes.data.status === 'BORROWED', `Book checkout successful (Loan ID: #${borrowRes.data?.id})`);

  const returnRes = await libraryService.returnBook(borrowRes.data.id, 1);
  assert(returnRes.success && returnRes.data.status === 'RETURNED', `Book return processed cleanly with calculated fines: $${returnRes.data?.fine_amount}`);

  // 2. Transport & Fleet Management Tests
  console.log('\n[2/5] Testing Transport & Fleet Management Engine (PostgreSQL)...');
  const transportStats = await transportService.getStats(1);
  assert(transportStats.success && transportStats.data.totalRoutes > 0, `Transport stats operational (Routes: ${transportStats.data?.totalRoutes})`);

  const routesResult = await transportService.getRoutes(1);
  assert(routesResult.success && routesResult.data.records.length > 0, `Retrieved ${routesResult.data?.records.length} designated commuter routes`);

  const vehiclesResult = await transportService.getVehicles(1);
  assert(vehiclesResult.success && vehiclesResult.data.records.length > 0, `Retrieved ${vehiclesResult.data?.records.length} fleet vehicles`);

  const assignRes = await transportService.assignStudent({
    studentId: testUserId,
    studentName: 'Julian Thorne',
    routeId: routesResult.data.records[0].id,
    pickupStop: 'Central Station Terminal',
    dropoffStop: 'GBS Main Campus'
  }, 1);
  assert(assignRes.success && assignRes.data.status === 'ACTIVE', `Student assigned to bus route #${routesResult.data.records[0].route_code}`);

  // 3. Inventory & Procurement Management Tests
  console.log('\n[3/5] Testing Inventory & Procurement Engine (PostgreSQL)...');
  const invStats = await inventoryService.getStats(1);
  assert(invStats.success && invStats.data.totalSkus > 0, `Inventory stats operational (SKUs: ${invStats.data?.totalSkus}, Value: $${invStats.data?.totalValuation})`);

  const itemsResult = await inventoryService.getItems(1, 'ALL');
  assert(itemsResult.success && itemsResult.data.records.length > 0, `Retrieved ${itemsResult.data?.records.length} stocked inventory items`);

  const sampleItem = itemsResult.data.records[0];
  const adjustRes = await inventoryService.adjustStock(sampleItem.id, {
    adjustmentAmount: 5,
    reason: 'Routine shipment restock'
  }, 1);
  assert(adjustRes.success && adjustRes.data.quantity_on_hand > sampleItem.quantity_on_hand, `Stock adjusted (+5). New quantity: ${adjustRes.data?.quantity_on_hand}`);

  const reqRes = await inventoryService.createRequest({
    itemId: sampleItem.id,
    requesterId: testUserId,
    requesterName: 'Dr. Evelyn Reed',
    department: 'SCIENCE',
    quantityRequested: 10,
    urgency: 'HIGH',
    notes: 'Urgent chemistry reagents'
  }, 1);
  assert(reqRes.success && reqRes.data.status === 'PENDING', `Purchase requisition created (${reqRes.data?.request_number})`);

  const approveRes = await inventoryService.updateRequestStatus(reqRes.data.id, { status: 'APPROVED' }, 1);
  assert(approveRes.success && approveRes.data.status === 'APPROVED', `Purchase requisition approved by manager`);

  // 4. HR & Staff Management Tests
  console.log('\n[4/5] Testing HR & Staff Governance Engine (PostgreSQL)...');
  const hrStats = await hrService.getStats(1);
  assert(hrStats.success && hrStats.data.totalStaff > 0, `HR stats operational (Staff Headcount: ${hrStats.data?.totalStaff})`);

  const staffResult = await hrService.getStaffProfiles(1);
  assert(staffResult.success && staffResult.data.records.length > 0, `Retrieved ${staffResult.data?.records.length} faculty and staff profiles with qualifications`);

  const calcRes = await hrService.calculateSalaryGrouping({
    baseStepAmount: 3200,
    qualificationRatio: 1.15,
    yearsOfService: 7,
    branchAllowance: 500,
    responsibilityAllowance: 300,
    housingTransportAllowance: 450,
    performanceBonus: 250
  });
  assert(calcRes.success && calcRes.data.grossSalary > 5000, `Salary progression evaluated cleanly: Gross $${calcRes.data?.grossSalary} (Band: ${calcRes.data?.serviceBand?.bandName})`);

  const leaveRes = await hrService.createLeaveRequest({
    staffId: testUserId,
    staffName: staffResult.data.records[0]?.name || 'Test Staff',
    staffRole: staffResult.data.records[0]?.role || 'STAFF',
    leaveType: 'CASUAL',
    startDate: '2026-11-10',
    endDate: '2026-11-12',
    daysCount: 2,
    reason: 'Professional workshop symposium'
  }, 1);
  assert(leaveRes.success && leaveRes.data.status === 'PENDING', `Staff leave request logged in database (ID: #${leaveRes.data?.id})`);

  // 5. AI Exam Scanner & OMR Engine Tests
  console.log('\n[5/5] Testing AI Exam Scanner & OMR Auto-Grading Engine (PostgreSQL)...');
  const exams = await aiExamService.getExams(1);
  assert(exams.length > 0, `Retrieved ${exams.length} academic exams with question banks`);

  const exam = exams[0];
  const scanGradeRes = await aiExamService.submitAnswerSheet({
    examId: exam.id,
    studentId: testUserId || 1,
    imageUrl: '/assets/academic-records-bg.jpg',
    extractedAnswers: { 1: 'A', 2: 'C', 3: 'B', 4: 'D', 5: 'A', 6: 'C', 7: 'B', 8: 'A', 9: 'D', 10: 'C' }
  });
  assert(scanGradeRes && scanGradeRes.scoreObtained > 0, `Deterministic OMR grading completed (Score: ${scanGradeRes.scoreObtained}/${scanGradeRes.totalMarks}, Grade: ${scanGradeRes.grade}, Confidence: ${scanGradeRes.confidencePct}%)`);

  const pastSheets = await aiExamService.getAnswerSheets(exam.id);
  assert(pastSheets.length > 0, `Answer sheet stored in PostgreSQL (Total sheets on record: ${pastSheets.length})`);

  await prisma.$disconnect();

  console.log('\n================================================================================');
  console.log(`   PROCEDURE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runProcedure2Tests().catch(err => {
  console.error('Procedure 2 Test Error:', err);
  process.exit(1);
});
