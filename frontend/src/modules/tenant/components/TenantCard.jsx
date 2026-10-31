import PropTypes from "prop-types";

function TenantCard({
    tenant
}) {
    return (
        <div className="tenant-card">
            <h3>{tenant?.name}</h3>

            <p>
                {tenant?.email}
            </p>

            <p>
                {tenant?.status}
            </p>
        </div>
    );
}

TenantCard.propTypes = {
    tenant: PropTypes.object
};

export default TenantCard;