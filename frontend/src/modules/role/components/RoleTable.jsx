import React from "react";
import PropTypes from "prop-types";

import Table from "../../shared/ui/Table";
import Button from "../../shared/ui/Button";
import EmptyState from "../../shared/components/EmptyState";

const RoleTable = ({
    roles = [],
    loading = false,
    onView,
    onEdit,
    onDelete
}) => {
    if (
        !loading &&
        roles.length === 0
    ) {
        return (
            <EmptyState
                title="No Roles Found"
                description="
                There are currently
                no roles available.
            "
            />
        );
    }

    const columns = [
        {
            key: "name",
            title: "Role"
        },
        {
            key: "displayName",
            title: "Display Name"
        },
        {
            key: "permissionsCount",
            title: "Permissions"
        },
        {
            key: "actions",
            title: "Actions",
            render: (_, row) => (
                <div
                    className="
                    flex
                    gap-2
                "
                >
                    <Button
                        size="sm"
                        onClick={() =>
                            onView(
                                row
                            )
                        }
                    >
                        View
                    </Button>

                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                            onEdit(
                                row
                            )
                        }
                    >
                        Edit
                    </Button>

                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() =>
                            onDelete(
                                row
                            )
                        }
                    >
                        Delete
                    </Button>
                </div>
            )
        }
    ];

    return (
        <Table
            loading={loading}
            columns={columns}
            data={roles}
            rowKey="_id"
        />
    );
};

RoleTable.propTypes = {
    roles: PropTypes.array,
    loading: PropTypes.bool,
    onView: PropTypes.func
        .isRequired,
    onEdit: PropTypes.func
        .isRequired,
    onDelete: PropTypes.func
        .isRequired
};

export default React.memo(
    RoleTable
);