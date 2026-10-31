import Loader
    from "../../shared/ui/Loader";

import EmptyState
    from "../../shared/components/EmptyState";

export default function AdmissionTable({
    data = [],
    loading = false,
    onApprove,
    onReject
}) {

    if (loading) {
        return <Loader />;
    }

    if (!data.length) {
        return (
            <EmptyState
                title="No Admissions Found"
                description="No admission records available."
            />
        );
    }

    return (
        <table className="table">

            <thead>

                <tr>
                    <th>
                        Admission No
                    </th>

                    <th>
                        Student
                    </th>

                    <th>
                        Class
                    </th>

                    <th>
                        Status
                    </th>

                    <th>
                        Actions
                    </th>
                </tr>

            </thead>

            <tbody>

                {data.map(
                    (
                        admission
                    ) => (
                        <tr
                            key={
                                admission.id
                            }
                        >

                            <td>
                                {
                                    admission.admissionNumber
                                }
                            </td>

                            <td>
                                {
                                    admission.firstName
                                }{" "}
                                {
                                    admission.lastName
                                }
                            </td>

                            <td>
                                {
                                    admission.className
                                }
                            </td>

                            <td>
                                {
                                    admission.status
                                }
                            </td>

                            <td>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onApprove?.(
                                            admission
                                        )
                                    }
                                >
                                    Approve
                                </button>

                                <button
                                    type="button"
                                    onClick={() =>
                                        onReject?.(
                                            admission
                                        )
                                    }
                                >
                                    Reject
                                </button>

                            </td>

                        </tr>
                    )
                )}

            </tbody>

        </table>
    );
}