import PropTypes from "prop-types";

function Badge({
    children
}) {

    return (
        <span className="gbs-badge">
            {children}
        </span>
    );
}

Badge.propTypes = {
    children: PropTypes.node
};

export default Badge;