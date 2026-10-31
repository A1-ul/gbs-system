"use strict";

const repository =
    require(
        "./rateLimit.repository"
    );

function consume(
    key,
    limit = 100
) {

    const existing =
        repository.get(
            key
        ) || {

            count: 0
        };

    existing.count += 1;

    repository.set(
        key,
        existing
    );

    return {

        allowed:
            existing.count <=
            limit,

        count:
            existing.count
    };
}

module.exports =
    Object.freeze({

        consume
    });