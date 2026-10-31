import {
    useEffect,
    useState
} from "react";

import studentApi
    from "../../api/student.api";

import PageContainer
    from "../../shared/components/PageContainer";

import PageHeader
    from "../../shared/components/PageHeader";

import Loader
    from "../../shared/ui/Loader";

import EmptyState
    from "../../shared/components/EmptyState";

export default function StudentPermissions() {

    const [
        permissions,
        setPermissions
    ] = useState([]);

    const [
        loading,
        setLoading
    ] = useState(true);

    useEffect(() => {
        loadPermissions();
    }, []);

    async function loadPermissions() {

        try {

            const response =
                await studentApi
                    .getStudentPermissions();

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
                title="Student Permissions"
                subtitle="Student access control matrix"
            />

            {
                permissions.length === 0
                    ? (
                        <EmptyState
                            title="No Permissions Found"
                            description="No student permissions available."
                        />
                    )
                    : (
                        <div className="grid gap-4">

                            {
                                permissions.map(
                                    (
                                        permission,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                permission.id ||
                                                index
                                            }
                                            className="bg-white rounded-lg border p-4 shadow-sm"
                                        >
                                            {
                                                permission.name ||
                                                permission
                                            }
                                        </div>
                                    )
                                )
                            }

                        </div>
                    )
            }

        </PageContainer>
    );
}