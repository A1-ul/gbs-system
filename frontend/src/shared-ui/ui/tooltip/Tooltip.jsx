import PropTypes from "prop-types";

function Tooltip({
    text,
    children
}) {

    return (
        <span
            title={text}
        >
            {children}
        </span>
    );
}

Tooltip.propTypes = {
    text: PropTypes.string,
    children: PropTypes.node
};

export default Tooltip;