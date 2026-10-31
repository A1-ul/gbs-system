import {
    useEffect,
    useState
} from "react";

import staffApi
from "../../api/staff.api";

export default function StaffDashboard() {
    const [stats, setStats] =
        useState({
            total: 0,
            active: 0,
            inactive: 0
        });

    useEffect(() => {
        loadDashboard();
    }, []);

    async function loadDashboard() {
        try {
            const response =
                await staffApi.getStaff();

            const records =
                response?.data ||
                response ||
                [];

            setStats({
                total:
                    records.length,

                active:
                    records.filter(
                        (x) =>
                            x.status ===
                            "ACTIVE"
                    ).length,

                inactive:
                    records.filter(
                        (x) =>
                            x.status !==
                            "ACTIVE"
                    ).length
            });
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <h1>
                Staff Dashboard
            </h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns:
                        "repeat(3,1fr)",
                    gap: "20px"
                }}
            >
                <div>
                    <h3>Total Staff</h3>
                    <h2>
                        {stats.total}
                    </h2>
                </div>

                <div>
                    <h3>Active Staff</h3>
                    <h2>
                        {stats.active}
                    </h2>
                </div>

                <div>
                    <h3>Inactive Staff</h3>
                    <h2>
                        {stats.inactive}
                    </h2>
                </div>
            </div>
        </div>
    );
}