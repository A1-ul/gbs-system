import DataTable
    from "../../shared/components/DataTable";

export default function ParentTable({
    data = [],
    loading = false,
    onView,
    onEdit,
    onDelete
}) {

    const columns = [

        {
            header:
                "First Name",
            accessorKey:
                "firstName"
        },

        {
            header:
                "Last Name",
            accessorKey:
                "lastName"
        },

        {
            header:
                "Email",
            accessorKey:
                "email"
        },

        {
            header:
                "Phone",
            accessorKey:
                "phone"
        },

        {
            header:
                "Occupation",
            accessorKey:
                "occupation"
        },

        {
            header:
                "Status",
            accessorKey:
                "status"
        }
    ];

    return (
        <DataTable
            data={data}
            columns={columns}
            loading={loading}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
        />
    );
}