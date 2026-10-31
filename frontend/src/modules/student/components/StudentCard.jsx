import Avatar from "../../shared/ui/Avatar";
import Badge from "../../shared/ui/Badge";

export default function StudentCard({
    student
}) {
    if (!student) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div
                className="flex gap-4 items-center"
            >
                <Avatar
                    name={`${student.firstName || ""} ${student.lastName || ""}`}
                />

                <div>
                    <h3 className="text-lg font-semibold">
                        {
                            student.firstName
                        }{" "}
                        {
                            student.lastName
                        }
                    </h3>

                    <p>
                        {
                            student.email
                        }
                    </p>

                    <Badge>
                        {student.status ||
                            "ACTIVE"}
                    </Badge>
                </div>
            </div>

            <div className="mt-4">
                <p>
                    <strong>
                        Admission No:
                    </strong>{" "}
                    {
                        student.admissionNumber
                    }
                </p>

                <p>
                    <strong>
                        Class:
                    </strong>{" "}
                    {
                        student.className
                    }
                </p>

                <p>
                    <strong>
                        Phone:
                    </strong>{" "}
                    {
                        student.phone
                    }
                </p>
            </div>
        </div>
    );
}