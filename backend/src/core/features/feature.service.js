"use strict";

const featureFlags =
    require(
        "./featureFlags"
    );

function getFeatureStatus(
    feature
) {

    return {

        feature,

        enabled:
            featureFlags.isEnabled(
                feature
            )
    };
}

function getAllFeatures() {

    return featureFlags.getFlags();
}

module.exports =
    Object.freeze({

        getFeatureStatus,

        getAllFeatures
    });