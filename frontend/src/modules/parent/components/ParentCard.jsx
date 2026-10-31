import Avatar from "../../shared/ui/Avatar";
import Badge from "../../shared/ui/Badge";

export default function ParentCard({
    parent
}) {

    if (!parent) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl p-6 shadow-md">

            <div className="flex items-center gap-4">

                <Avatar
                    name={`${parent.firstName || ""} ${parent.lastName || ""}`}
                />

                <div>

                    <h3 className="text-lg font-semibold">
                        {parent.firstName}
                        {" "}
                        {parent.lastName}
                    </h3>

                    <p>
                        {parent.email}
                    </p>

                    <Badge>
                        {
                            parent.status ||
                            "ACTIVE"
                        }
                    </Badge>

                </div>

            </div>

            <div className="mt-4 space-y-2">

                <p>
                    <strong>
                        Phone:
                    </strong>
                    {" "}
                    {parent.phone}
                </p>

                <p>
                    <strong>
                        Occupation:
                    </strong>
                    {" "}
                    {parent.occupation}
                </p>

                <p>
                    <strong>
                        Address:
                    </strong>
                    {" "}
                    {parent.address}
                </p>

            </div>

        </div>
    );
}