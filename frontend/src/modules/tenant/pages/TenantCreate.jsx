import { useNavigate } from "react-router-dom";

import TenantForm from "../components/TenantForm";
import { createTenant } from "../../api/tenant.api";

function TenantCreate() {
    const navigate =
        useNavigate();

    const handleSubmit =
        async (data) => {
            await createTenant(
                data
            );

            navigate(
                "/tenants"
            );
        };

    return (
        <TenantForm
            onSubmit={
                handleSubmit
            }
        />
    );
}

export default TenantCreate;