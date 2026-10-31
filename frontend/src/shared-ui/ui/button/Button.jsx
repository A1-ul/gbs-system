import PropTypes from "prop-types";

function Button({
    type = "button",
    children,
    className = "",
    disabled = false,
    loading = false,
    onClick
}) {

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={`gbs-btn ${className}`}
        >
            {
                loading
                    ? "Loading..."
                    : children
            }
        </button>
    );
}

Button.propTypes = {
    type: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    onClick: PropTypes.func
};

export default Button;