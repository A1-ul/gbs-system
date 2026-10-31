import {
    useEffect,
    useState
} from "react";

import {
    useParams,
    useNavigate
} from "react-router-dom";

import StaffForm from "../components/StaffForm";
import staffApi from "../api/staff.api";

export default function StaffEdit() {
    const { id } = useParams();

    const navigate =
        useNavigate();

    const [staff, setStaff] =
        useState(null);

    useEffect(() => {
        loadStaff();
    }, [id]);

    async function loadStaff() {
        try {
            const response =
                await staffApi.getStaffById(
                    id
                );

            setStaff(
                response?.data ||
                response
            );
        } catch (error) {
            console.error(error);
        }
    }

    async function handleSubmit(
        values
    ) {
        try {
            await staffApi.updateStaff(
                id,
                values
            );

            navigate("/staff");
        } catch (error) {
            console.error(error);
        }
    }

    if (!staff) {
        return (
            <div>
                Loading Staff...
            </div>
        );
    }

    return (
        <div>
            <h1>Edit Staff</h1>

            <StaffForm
                initialValues={staff}
                onSubmit={handleSubmit}
            />
        </div>
    );
}