"use strict";

/*
==================================================
DASHBOARD CONTROLLER
ENTERPRISE HARDENED
COMMONJS ONLY
==================================================
*/

let dashboardService = null;

try {

    dashboardService =
        require(
            "./dashboard.service"
        );

} catch (error) {

    console.error(
        "[DASHBOARD] SERVICE LOAD FAILURE:",
        error.message
    );
}

function serviceAvailable() {

    return Boolean(
        dashboardService &&
        typeof dashboardService.getStatus === "function" &&
        typeof dashboardService.getDashboard === "function"
    );
}

async function status(
    req,
    res
) {

    try {

        if (!serviceAvailable()) {

            return res.status(500).json({

                success: false,
                message:
                    "Dashboard service unavailable"
            });
        }

        const result =
            await dashboardService.getStatus();

        return res.status(200).json(
            result
        );

    } catch (error) {

        console.error(
            "[DASHBOARD STATUS ERROR]",
            error
        );

        return res.status(500).json({

            success: false,
            message:
                "Dashboard status failed"
        });
    }
}

async function dashboard(
    req,
    res
) {

    try {

        if (!serviceAvailable()) {

            return res.status(500).json({

                success: false,
                message:
                    "Dashboard service unavailable"
            });
        }

        const result =
            await dashboardService.getDashboard();

        return res.status(200).json(
            result
        );

    } catch (error) {

        console.error(
            "[DASHBOARD ERROR]",
            error
        );

        return res.status(500).json({

            success: false,
            message:
                "Dashboard retrieval failed"
        });
    }
}

module.exports =
    Object.freeze({

        status,
        dashboard
    });