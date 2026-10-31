export default function StaffCard({
    staff
}) {
    return (
        <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold">
                {staff?.firstName}
                {" "}
                {staff?.lastName}
            </h3>

            <p>{staff?.email}</p>

            <p>{staff?.phone}</p>
        </div>
    );
}