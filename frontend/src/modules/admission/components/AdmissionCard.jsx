export default function AdmissionCard({
    admission
}) {

    if (!admission) {
        return null;
    }

    return (
        <div className="card">

            <h3>
                {
                    admission.firstName
                }{" "}
                {
                    admission.lastName
                }
            </h3>

            <p>
                Admission No:
                {" "}
                {
                    admission.admissionNumber
                }
            </p>

            <p>
                Email:
                {" "}
                {
                    admission.email
                }
            </p>

            <p>
                Class:
                {" "}
                {
                    admission.className
                }
            </p>

            <p>
                Status:
                {" "}
                {
                    admission.status
                }
            </p>

        </div>
    );
}