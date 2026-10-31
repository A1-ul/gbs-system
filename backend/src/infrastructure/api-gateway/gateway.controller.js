"use strict";

const gatewayService =
    require(
        "./gateway.service"
    );

async function health(
    req,
    res
) {

    return res
        .status(200)
        .json({

            success:
                true,

            data:
                gatewayService.getGatewayInfo()
        });
}

module.exports =
    Object.freeze({

        health
    });