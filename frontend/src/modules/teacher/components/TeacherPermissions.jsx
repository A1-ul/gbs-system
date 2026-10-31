import { useEffect, useState } from "react";
import teacherApi from "../api/teacher.api";

import PageContainer from "../../shared/components/PageContainer";
import PageHeader from "../../shared/components/PageHeader";
import Loader from "../../shared/ui/Loader";
import EmptyState from "../../shared/components/EmptyState";

export default function TeacherPermissions() {
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPermissions();
    }, []);

    async function loadPermissions() {
        try {
            const response =
                await teacherApi.getTeacherPermissions();

            setPermissions(
                response?.data || []
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return <Loader />;
    }

    return (
        <PageContainer>
            <PageHeader
                title="Teacher Permissions"
                subtitle="Teacher module access controls"
            />

            {!permissions.length ? (
                <EmptyState
                    title="No Permissions Found"
                />
            ) : (
                <div className="grid gap-3">
                    {permissions.map(
                        (permission) => (
                            <div
                                key={permission.id}
                                className="p-3 border rounded"
                            >
                                {permission.name}
                            </div>
                        )
                    )}
                </div>
            )}
        </PageContainer>
    );
}