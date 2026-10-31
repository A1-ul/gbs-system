import DataTable from "../../shared/components/DataTable";

export default function StudentTable({
    data = [],
    loading = false,
    onView,
    onEdit,
    onDelete
}) {
    const columns = [
        {
            header:
                "Admission No",
            accessorKey:
                "admissionNumber"
        },

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
                "Class",
            accessorKey:
                "className"
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