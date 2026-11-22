import PropTypes from "prop-types";

function Tooltip({
    text,
    children
}) {
    // Tooltips disabled system-wide per UI directive
    void text;
    return (
        <span>
            {children}
        </span>
    );
}

Tooltip.propTypes = {
    text: PropTypes.string,
    children: PropTypes.node
};

export default Tooltip;