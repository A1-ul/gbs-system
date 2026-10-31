import PropTypes from "prop-types";

function Dropdown({
    options = [],
    ...props
}) {

    return (
        <select
            {...props}
            className="gbs-dropdown"
        >
            {
                options.map(
                    (option) => (
                        <option
                            key={option.value}
                            value={option.value}
                        >
                            {option.label}
                        </option>
                    )
                )
            }
        </select>
    );
}

Dropdown.propTypes = {
    options: PropTypes.array
};

export default Dropdown;