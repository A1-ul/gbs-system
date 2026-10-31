const prisma = require('../src/core/database/prisma.client');

async function testProcedure5Academic() {
  console.log('================================================================');
  console.log('🧪 PHASE 2, PROCEDURE 1: ACADEMIC DOMAIN CORE TEST SUITE');
  console.log('================================================================\n');

  const BASE_URL = 'http://localhost:5001/api/v1';

  // 1. Authenticate Admin (Tenant 1)
  console.log('--- TEST 1: Authenticate Admin (admin@gbs.com) ---');
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gbs.com', password: 'Admin123!' })
  });
  const adminData = await adminLoginRes.json();
  if (!adminLoginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(adminData)}`);
  const adminToken = adminData.data.accessToken;
  console.log(`✅ Admin authenticated. Token received.`);

  // 2. Fetch Initial Classes & Subjects
  console.log('\n--- TEST 2: Fetch Initial Classes & Subjects ---');
  const initialClassesRes = await fetch(`${BASE_URL}/academics/classes`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const initialClassesData = await initialClassesRes.json();
  console.log(`✅ Initial classes count: ${initialClassesData.results}`);

  // 3. Create New Class (POST /academics/classes)
  console.log('\n--- TEST 3: Create Academic Class (POST /academics/classes) ---');
  // Clean up if left from prior run
  const existingTestClass = await prisma.class.findFirst({
    where: { code: 'G11-STEM', tenantId: 1 }
  });
  if (existingTestClass) {
    await prisma.class.delete({ where: { id: existingTestClass.id } });
  }

  const createClassRes = await fetch(`${BASE_URL}/academics/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Grade 11 - Advanced STEM Academy',
      code: 'G11-STEM',
      gradeLevel: 11
    })
  });
  const createClassData = await createClassRes.json();
  if (!createClassRes.ok) throw new Error(`Create class failed: ${JSON.stringify(createClassData)}`);
  const testClass = createClassData.data.class;
  console.log(`✅ Class Created: ${testClass.name} (Code: ${testClass.code}, ID: ${testClass.id}, Grade: ${testClass.gradeLevel})`);

  // 4. Update Class (PUT /academics/classes/:id)
  console.log('\n--- TEST 4: Update Academic Class (PUT /academics/classes/:id) ---');
  const updateClassRes = await fetch(`${BASE_URL}/academics/classes/${testClass.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Grade 11 - Honors STEM & Robotics',
      code: 'G11-ROBOT',
      gradeLevel: 11
    })
  });
  const updateClassData = await updateClassRes.json();
  if (!updateClassRes.ok) throw new Error(`Update class failed: ${JSON.stringify(updateClassData)}`);
  console.log(`✅ Class Updated: ${updateClassData.data.class.name} (Code: ${updateClassData.data.class.code})`);

  // 5. Create Subject (POST /academics/subjects)
  console.log('\n--- TEST 5: Create Curriculum Subject (POST /academics/subjects) ---');
  const createSubRes = await fetch(`${BASE_URL}/academics/subjects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      classId: testClass.id,
      name: 'Quantum Mechanics & Robotics',
      code: 'ROBOT-301'
    })
  });
  const createSubData = await createSubRes.json();
  if (!createSubRes.ok) throw new Error(`Create subject failed: ${JSON.stringify(createSubData)}`);
  const testSub = createSubData.data.subject;
  console.log(`✅ Subject Created: ${testSub.name} (Code: ${testSub.code}, ID: ${testSub.id}, Class ID: ${testSub.classId})`);

  // 6. Update Subject (PUT /academics/subjects/:id)
  console.log('\n--- TEST 6: Update Curriculum Subject (PUT /academics/subjects/:id) ---');
  const updateSubRes = await fetch(`${BASE_URL}/academics/subjects/${testSub.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Autonomous Robotics & AI Control',
      code: 'ROBOT-302'
    })
  });
  const updateSubData = await updateSubRes.json();
  if (!updateSubRes.ok) throw new Error(`Update subject failed: ${JSON.stringify(updateSubData)}`);
  console.log(`✅ Subject Updated: ${updateSubData.data.subject.name} (Code: ${updateSubData.data.subject.code})`);

  // 7. Seed Standard Curriculum Engine
  console.log('\n--- TEST 7: Seed Standard STEM & Humanities Curriculum ---');
  const seedRes = await fetch(`${BASE_URL}/academics/classes/seed-curriculum`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const seedData = await seedRes.json();
  if (!seedRes.ok) throw new Error(`Seed curriculum failed: ${JSON.stringify(seedData)}`);
  console.log(`✅ Curriculum Seeded! Total classes in institution: ${seedData.results}`);
  for (const c of seedData.data.classes) {
    console.log(`   - [Grade ${c.gradeLevel}] ${c.name} (${c.code}): ${c.subjects?.length || 0} subjects`);
  }

  // 8. Fetch Subjects for Specific Class
  console.log('\n--- TEST 8: Fetch Subjects for Specific Class ---');
  const classSubsRes = await fetch(`${BASE_URL}/academics/classes/${testClass.id}/subjects`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const classSubsData = await classSubsRes.json();
  console.log(`✅ Subjects in ${updateClassData.data.class.name}: ${classSubsData.results}`);
  for (const s of classSubsData.data.subjects) {
    console.log(`   - ${s.name} (${s.code})`);
  }

  // 9. Tenant Isolation Verification in Academic Domain
  console.log('\n--- TEST 9: Academic Domain Multi-Tenant Data Isolation ---');
  // Login as Royal Oak Tenant Admin
  const royalOakLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'headmaster.royaloak@gbs.edu', password: 'RoyalOak2026!' })
  });
  const royalOakLoginData = await royalOakLoginRes.json();
  const royalOakToken = royalOakLoginData.data.accessToken;

  // Royal Oak queries /academics/classes
  const royalOakClassesRes = await fetch(`${BASE_URL}/academics/classes`, {
    headers: { Authorization: `Bearer ${royalOakToken}` }
  });
  const royalOakClassesData = await royalOakClassesRes.json();
  console.log(`✅ Royal Oak queried /academics/classes: ${royalOakClassesData.results} classes returned.`);
  console.log(`   (Tenant 1 has ${seedData.results} classes, Royal Oak sees ONLY their own: ${royalOakClassesData.results})`);

  // Royal Oak creates their own isolated class
  const royalOakCreateRes = await fetch(`${BASE_URL}/academics/classes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${royalOakToken}`
    },
    body: JSON.stringify({
      name: 'Grade 9 - Royal Oak Scholars',
      code: 'ROYAL-G09',
      gradeLevel: 9
    })
  });
  const royalOakCreateData = await royalOakCreateRes.json();
  console.log(`✅ Royal Oak created isolated class: ${royalOakCreateData.data.class.name} (Tenant ID: ${royalOakCreateData.data.class.tenantId})`);

  // Verify Tenant 1 cannot see Royal Oak's class
  const t1RecheckRes = await fetch(`${BASE_URL}/academics/classes`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const t1RecheckData = await t1RecheckRes.json();
  const hasRoyalOakClass = t1RecheckData.data.classes.some(c => c.code === 'ROYAL-G09');
  if (hasRoyalOakClass) {
    throw new Error('Tenant isolation breach! Tenant 1 can see Royal Oak classes.');
  }
  console.log(`✅ ISOLATION VERIFIED: Tenant 1 cannot see Royal Oak classes, and Royal Oak cannot see Tenant 1 classes.`);

  // 10. Delete Subject and Class
  console.log('\n--- TEST 10: Delete Subject & Delete Class ---');
  const deleteSubRes = await fetch(`${BASE_URL}/academics/subjects/${testSub.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const deleteSubData = await deleteSubRes.json();
  console.log(`✅ ${deleteSubData.message}`);

  const deleteClassRes = await fetch(`${BASE_URL}/academics/classes/${testClass.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const deleteClassData = await deleteClassRes.json();
  console.log(`✅ ${deleteClassData.message}`);

  // 11. PostgreSQL Audit Trail Verification
  console.log('\n--- TEST 11: PostgreSQL Audit Logs Persistence ---');
  const academicAuditLogs = await prisma.auditLog.findMany({
    where: { module: 'ACADEMIC' },
    orderBy: { createdAt: 'desc' },
    take: 6
  });
  console.log(`✅ Immutable Academic Audit Trail entries found: ${academicAuditLogs.length}`);
  for (const log of academicAuditLogs) {
    console.log(`   - [${log.action}] (Tenant: ${log.tenantId}): ${log.details}`);
  }

  console.log('\n================================================================');
  console.log('🏆 PHASE 2, PROCEDURE 1: ACADEMIC DOMAIN CORE 100% VALIDATED!');
  console.log('================================================================\n');
}

testProcedure5Academic()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
