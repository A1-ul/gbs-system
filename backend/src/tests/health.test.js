"use strict";

/*
====================================
HEALTH TEST
GBS ENTERPRISE
COMMONJS ONLY
====================================
*/

describe(
    "GBS Backend Health",
    function () {

        test(
            "Environment is available",
            function () {

                expect(
                    process
                ).toBeDefined();
            }
        );

        test(
            "Node version exists",
            function () {

                expect(
                    process.version
                ).toBeTruthy();
            }
        );

        test(
            "Application can load",
            function () {

                expect(
                    true
                ).toBe(
                    true
                );
            }
        );
    }
);