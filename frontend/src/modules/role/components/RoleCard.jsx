import React from "react";
import PropTypes from "prop-types";

import Badge from "../../shared/ui/Badge";

const RoleCard = ({
    role,
    onView
}) => {
    return (
        <div
            className="
            bg-white
            rounded-xl
            border
            p-5
            shadow-sm
        "
        >
            <div
                className="
                flex
                justify-between
                items-center
                mb-3
            "
            >
                <h3
                    className="
                    text-lg
                    font-semibold
                "
                >
                    {role.name}
                </h3>

                <Badge>
                    {
                        role.permissionsCount
                    }
                </Badge>
            </div>

            <p
                className="
                text-sm
                text-gray-500
                mb-4
            "
            >
                {
                    role.description ||
                    "No description available"
                }
            </p>

            <button
                type="button"
                onClick={() =>
                    onView(role)
                }
                className="
                text-blue-600
                hover:underline
            "
            >
                View Details
            </button>
        </div>
    );
};

RoleCard.propTypes = {
    role: PropTypes.object
        .isRequired,
    onView: PropTypes.func
        .isRequired
};

export default React.memo(
    RoleCard
);