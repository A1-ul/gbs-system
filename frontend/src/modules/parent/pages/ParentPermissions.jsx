import { useEffect, useState } from "react";
import parentApi from "../../api/parent.api";

export default function ParentPermissions() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadPermissions() {
            try {
                const response =
                    await parentApi.getParentPermissions();

                if (mounted) {
                    setPermissions(
                        response?.data || []
                    );
                }
            } catch (error) {
                console.error(
                    "Parent permissions load failed",
                    error
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        loadPermissions();

        return () => {
            mounted = false;
        };
    }, []);

    return (
        <div className="page-container">
            <h1>Parent Permissions</h1>

            {loading ? (
                <p>Loading permissions...</p>
            ) : (
                <ul>
                    {permissions.map(
                        (permission) => (
                            <li
                                key={
                                    permission.id
                                }
                            >
                                {
                                    permission.name
                                }
                            </li>
                        )
                    )}
                </ul>
            )}
        </div>
    );
}