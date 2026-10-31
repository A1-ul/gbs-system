import React from "react";

import Table from "../../shared/ui/Table";
import EmptyState from "../../shared/components/EmptyState";
import Loader from "../../shared/ui/Loader";

const PermissionTable = ({
    permissions = [],
    loading = false,
    onView,
    onEdit,
    onDelete
}) => {
    if (loading) {
        return <Loader />;
    }

    if (!permissions.length) {
        return (
            <EmptyState
                title="No Permissions Found"
                description="Create a permission to get started."
            />
        );
    }

    const columns = [
        {
            header: "Name",
            accessor: "name"
        },
        {
            header: "Code",
            accessor: "code"
        },
        {
            header: "Description",
            accessor: "description"
        },
        {
            header: "Actions",
            accessor: "actions",
            cell: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={() =>
                            onView?.(row)
                        }
                    >
                        View
                    </button>

                    <button
                        onClick={() =>
                            onEdit?.(row)
                        }
                    >
                        Edit
                    </button>

                    <button
                        onClick={() =>
                            onDelete?.(row)
                        }
                    >
                        Delete
                    </button>
                </div>
            )
        }
    ];

    return (
        <Table
            columns={columns}
            data={permissions}
        />
    );
};

export default PermissionTable;