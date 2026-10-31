import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import staffApi from "../api/staff.api";

export default function StaffList() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStaff();
    }, []);

    async function loadStaff() {
        try {
            const response =
                await staffApi.getStaff();

            setStaff(
                response?.data ||
                response ||
                []
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <div>Loading Staff...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Staff Management</h1>

                <Link
                    to="/staff/create"
                    className="btn btn-primary"
                >
                    Create Staff
                </Link>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Position</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    {staff.map((item) => (
                        <tr key={item.id}>
                            <td>{item.fullName}</td>
                            <td>{item.email}</td>
                            <td>{item.position}</td>
                            <td>{item.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}