import Avatar from "../../shared/ui/Avatar";
import Badge from "../../shared/ui/Badge";

export default function TeacherCard({
    teacher
}) {
    if (!teacher) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center gap-4">

                <Avatar
                    name={`${teacher.firstName || ""} ${teacher.lastName || ""}`}
                />

                <div>
                    <h3 className="text-lg font-semibold">
                        {teacher.firstName}{" "}
                        {teacher.lastName}
                    </h3>

                    <p>
                        {teacher.email}
                    </p>

                    <Badge>
                        {teacher.status ||
                            "ACTIVE"}
                    </Badge>
                </div>

            </div>

            <div className="mt-4 space-y-2">

                <p>
                    <strong>
                        Employee ID:
                    </strong>{" "}
                    {
                        teacher.employeeId
                    }
                </p>

                <p>
                    <strong>
                        Department:
                    </strong>{" "}
                    {
                        teacher.department
                    }
                </p>

                <p>
                    <strong>
                        Subject:
                    </strong>{" "}
                    {
                        teacher.subject
                    }
                </p>

                <p>
                    <strong>
                        Phone:
                    </strong>{" "}
                    {
                        teacher.phone
                    }
                </p>

            </div>
        </div>
    );
}