import { useEffect, useState } from "react";
import {
    useNavigate,
    useParams
} from "react-router-dom";

import TenantForm from "../components/TenantForm";

import {
    getTenant,
    updateTenant
} from "../../api/tenant.api";

function TenantEdit() {
    const navigate =
        useNavigate();

    const { id } =
        useParams();

    const [tenant, setTenant] =
        useState(null);

    useEffect(() => {
        getTenant(id).then(
            setTenant
        );
    }, [id]);

    if (!tenant) {
        return <div>Loading...</div>;
    }

    const handleSubmit =
        async (data) => {
            await updateTenant(
                id,
                data
            );

            navigate(
                "/tenants"
            );
        };

    return (
        <TenantForm
            initialValues={
                tenant
            }
            onSubmit={
                handleSubmit
            }
        />
    );
}

export default TenantEdit;