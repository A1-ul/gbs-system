import {
    useEffect,
    useState
} from "react";

import TenantTable from "../components/TenantTable";

import {
    getTenants
} from "../../api/tenant.api";

function TenantList() {
    const [tenants, setTenants] =
        useState([]);

    useEffect(() => {
        getTenants().then(
            setTenants
        );
    }, []);

    return (
        <TenantTable
            tenants={tenants}
        />
    );
}

export default TenantList;