import {
    useEffect,
    useState
} from "react";

export default function AdmissionForm({
    initialValues = {},
    loading = false,
    onSubmit
}) {

    const [
        formData,
        setFormData
    ] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        admissionNumber: "",
        className: "",
        status: "PENDING"
    });

    useEffect(() => {

        setFormData(
            (previous) => ({
                ...previous,
                ...initialValues
            })
        );

    }, [initialValues]);

    function handleChange(
        event
    ) {

        const {
            name,
            value
        } = event.target;

        setFormData(
            (previous) => ({
                ...previous,
                [name]: value
            })
        );
    }

    function handleSubmit(
        event
    ) {

        event.preventDefault();

        if (
            typeof onSubmit ===
            "function"
        ) {
            onSubmit(formData);
        }
    }

    return (
        <form
            onSubmit={
                handleSubmit
            }
            className="space-y-4"
        >

            <input
                name="firstName"
                value={
                    formData.firstName
                }
                onChange={
                    handleChange
                }
                placeholder="First Name"
                required
            />

            <input
                name="lastName"
                value={
                    formData.lastName
                }
                onChange={
                    handleChange
                }
                placeholder="Last Name"
                required
            />

            <input
                type="email"
                name="email"
                value={
                    formData.email
                }
                onChange={
                    handleChange
                }
                placeholder="Email"
            />

            <input
                name="phone"
                value={
                    formData.phone
                }
                onChange={
                    handleChange
                }
                placeholder="Phone"
            />

            <input
                name="admissionNumber"
                value={
                    formData.admissionNumber
                }
                onChange={
                    handleChange
                }
                placeholder="Admission Number"
            />

            <input
                name="className"
                value={
                    formData.className
                }
                onChange={
                    handleChange
                }
                placeholder="Class"
            />

            <select
                name="status"
                value={
                    formData.status
                }
                onChange={
                    handleChange
                }
            >
                <option value="PENDING">
                    PENDING
                </option>

                <option value="APPROVED">
                    APPROVED
                </option>

                <option value="REJECTED">
                    REJECTED
                </option>
            </select>

            <button
                type="submit"
                disabled={loading}
            >
                {
                    loading
                        ? "Saving..."
                        : "Save Admission"
                }
            </button>

        </form>
    );
}