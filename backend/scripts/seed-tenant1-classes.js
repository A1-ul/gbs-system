const prisma = require('../src/core/database/prisma.client');
const academicService = require('../src/modules/academic/academic.service');

async function seedTenant1() {
  console.log('Seeding enterprise academic curriculum for Tenant 1...');
  
  // 1. Seed classes and subjects
  const classes = await academicService.seedCurriculum(1, { id: 17, email: 'admin@gbs.com', role: 'SUPER_ADMIN' });
  console.log(`✓ Seeded ${classes.length} classes for Tenant 1:`);
  classes.forEach(c => console.log(`   - Class #${c.id}: ${c.name} (${c.code})`));

  // 2. Find student@gbs.com
  const student = await prisma.user.findFirst({
    where: { email: 'student@gbs.com' }
  });

  if (student && classes.length > 0) {
    const targetClass = classes[0];
    
    // Enroll student in class
    const existingEnrollment = await prisma.classEnrollment.findFirst({
      where: { classId: targetClass.id, studentId: student.id }
    });

    if (!existingEnrollment) {
      await prisma.classEnrollment.create({
        data: {
          tenantId: 1,
          classId: targetClass.id,
          studentId: student.id,
          status: 'ACTIVE'
        }
      });
      console.log(`✓ Enrolled student ${student.email} in Class #${targetClass.id} (${targetClass.name})`);
    }

    // Find a subject for this class
    const subject = await prisma.subject.findFirst({
      where: { classId: targetClass.id }
    });

    // Create an assignment
    const existingAssignment = await prisma.assignment.findFirst({
      where: { classId: targetClass.id }
    });

    if (!existingAssignment && subject) {
      const assignment = await prisma.assignment.create({
        data: {
          tenantId: 1,
          classId: targetClass.id,
          subjectId: subject.id,
          teacherId: 18,
          title: 'Term 1 Advanced Mathematics Problem Set #1',
          description: 'Solve problems 1-10 on differential calculus and matrix operations.',
          dueDate: new Date(Date.now() + 14 * 86400000),
          maxScore: 100,
          status: 'PUBLISHED'
        }
      });
      console.log(`✓ Published assignment #${assignment.id}: ${assignment.title}`);
    }
  }

  console.log('Tenant 1 academic seeding complete!');
}

seedTenant1()
  .catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
