import PropTypes from "prop-types";

function Input({
    label,
    error,
    ...props
}) {

    return (
        <div className="gbs-input-group">

            {label && (
                <label>
                    {label}
                </label>
            )}

            <input
                {...props}
                className="gbs-input"
            />

            {
                error &&
                (
                    <small>
                        {error}
                    </small>
                )
            }

        </div>
    );
}

Input.propTypes = {
    label: PropTypes.string,
    error: PropTypes.string
};

export default Input;