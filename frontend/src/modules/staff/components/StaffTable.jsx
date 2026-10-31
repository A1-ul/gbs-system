import DataTable from "../../shared/components/DataTable";

export default function StaffTable({
    data = []
}) {
    const columns = [
        {
            header: "First Name",
            accessorKey: "firstName"
        },
        {
            header: "Last Name",
            accessorKey: "lastName"
        },
        {
            header: "Email",
            accessorKey: "email"
        },
        {
            header: "Phone",
            accessorKey: "phone"
        }
    ];

    return (
        <DataTable
            columns={columns}
            data={data}
        />
    );
}