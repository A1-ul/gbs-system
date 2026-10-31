"use strict";

const seedAdmin =
    require(
        "./admin.seed"
    );

const seedRoles =
    require(
        "./roles.seed"
    );

const seedPermissions =
    require(
        "./permission.seed"
    );

const seedTenant =
    require(
        "./tenant.seed"
    );

async function runSeeds() {

    const results =
        [];

    results.push(
        await seedTenant()
    );

    results.push(
        await seedRoles()
    );

    results.push(
        await seedPermissions()
    );

    results.push(
        await seedAdmin()
    );

    return results;
}

module.exports =
    runSeeds;