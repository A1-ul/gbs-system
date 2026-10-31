import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { getTenant } from "../../api/tenant.api";

function TenantDetails() {
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

    return (
        <div>
            <h2>
                {tenant.name}
            </h2>

            <p>
                {tenant.email}
            </p>
        </div>
    );
}

export default TenantDetails;