import PropTypes from "prop-types";

function TenantTable({
    tenants = []
}) {
    return (
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                </tr>
            </thead>

            <tbody>
                {tenants.map(
                    (tenant) => (
                        <tr
                            key={
                                tenant.id
                            }
                        >
                            <td>
                                {
                                    tenant.name
                                }
                            </td>

                            <td>
                                {
                                    tenant.email
                                }
                            </td>

                            <td>
                                {
                                    tenant.status
                                }
                            </td>
                        </tr>
                    )
                )}
            </tbody>
        </table>
    );
}

TenantTable.propTypes = {
    tenants: PropTypes.array
};

export default TenantTable;