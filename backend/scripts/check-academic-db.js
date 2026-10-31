const prisma = require('../src/core/database/prisma.client');

async function checkAcademic() {
  const classes = await prisma.class.findMany({
    include: { subjects: true, exams: true }
  });
  const subjects = await prisma.subject.findMany();
  console.log(`Classes count: ${classes.length}`);
  console.log(JSON.stringify(classes, null, 2));
  console.log(`Subjects count: ${subjects.length}`);
}

checkAcademic().finally(() => prisma.$disconnect());
