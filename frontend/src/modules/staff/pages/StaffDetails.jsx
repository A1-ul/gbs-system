import {
    useEffect,
    useState
} from "react";

import {
    useParams
} from "react-router-dom";

import StaffCard
from "../components/StaffCard";

import staffApi
from "../../api/staff.api";

export default function StaffDetails() {
    const { id } =
        useParams();

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

    if (!staff) {
        return (
            <div>
                Loading Staff...
            </div>
        );
    }

    return (
        <div>
            <h1>
                Staff Details
            </h1>

            <StaffCard
                staff={staff}
            />
        </div>
    );
}