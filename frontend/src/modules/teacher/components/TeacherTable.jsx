import DataTable from "../../shared/components/DataTable";

export default function TeacherTable({
    data = [],
    loading = false,
    onView,
    onEdit,
    onDelete
}) {
    const columns = [
        {
            header:
                "Employee ID",
            accessorKey:
                "employeeId"
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
                "Department",
            accessorKey:
                "department"
        },

        {
            header:
                "Subject",
            accessorKey:
                "subject"
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