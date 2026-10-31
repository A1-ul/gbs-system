import PropTypes from "prop-types";
import Input from "../ui/Input";

function SearchBar({
    value,
    placeholder,
    onChange
}) {

    return (
        <Input
            type="search"
            value={value}
            placeholder={placeholder}
            onChange={(event) =>
                onChange(event.target.value)
            }
        />
    );
}

SearchBar.propTypes = {
    value: PropTypes.string,
    placeholder: PropTypes.string,
    onChange: PropTypes.func
};

SearchBar.defaultProps = {
    value: "",
    placeholder: "Search...",
    onChange: () => {}
};

export default SearchBar;