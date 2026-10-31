import { useNavigate } from "react-router-dom";
import StaffForm from "../components/StaffForm";
import staffApi from "../api/staff.api";

export default function StaffCreate() {
    const navigate = useNavigate();

    async function handleSubmit(values) {
        try {
            await staffApi.createStaff(
                values
            );

            navigate("/staff");
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <h1>Create Staff</h1>

            <StaffForm
                onSubmit={handleSubmit}
            />
        </div>
    );
}