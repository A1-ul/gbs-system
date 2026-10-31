"use strict";

const prisma = require("../../config/prisma");
const bcrypt = require("bcryptjs");

async function seedUsers() {
    try {
        console.log("STARTING DATABASE SEED");

        // 1. Ensure default tenant exists
        let tenant = await prisma.tenant.findUnique({
            where: { code: "DEFAULT" }
        });

        if (!tenant) {
            tenant = await prisma.tenant.create({
                data: {
                    name: "GBS International School",
                    code: "DEFAULT",
                    domain: "gbs.com",
                    isActive: true
                }
            });
            console.log("CREATED DEFAULT TENANT:", tenant.code);
        } else {
            console.log("DEFAULT TENANT EXISTS:", tenant.code);
        }

        // 2. Hash testing password
        const passwordHash = await bcrypt.hash("Test12345", 12);

        // 3. Define users to seed
        const users = [
            {
                email: "admin@gbs.com",
                role: "SUPER_ADMIN",
                firstName: "GBS",
                lastName: "Admin"
            },
            {
                email: "teacher@gbs.com",
                role: "TEACHER",
                firstName: "Jane",
                lastName: "Doe"
            },
            {
                email: "student@gbs.com",
                role: "STUDENT",
                firstName: "John",
                lastName: "Smith"
            },
            {
                email: "parent@gbs.com",
                role: "PARENT",
                firstName: "Robert",
                lastName: "Smith"
            },
            {
                email: "accountant@gbs.com",
                role: "ACCOUNTANT",
                firstName: "Alice",
                lastName: "Johnson"
            },
            {
                email: "staff@gbs.com",
                role: "STAFF",
                firstName: "David",
                lastName: "Williams"
            }
        ];

        // 4. Upsert users
        for (const user of users) {
            const upserted = await prisma.user.upsert({
                where: { email: user.email },
                update: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    password: passwordHash,
                    tenantId: tenant.id,
                    isActive: true
                },
                create: {
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    password: passwordHash,
                    tenantId: tenant.id,
                    isActive: true
                }
            });

            console.log(`SEED USER: ${upserted.email} (Role: ${upserted.role})`);
        }

        console.log("DATABASE SEEDING COMPLETED SUCCESSFULLY");
        process.exit(0);
    } catch (error) {
        console.error("SEEDING FAILED:", error);
        process.exit(1);
    }
}

seedUsers();