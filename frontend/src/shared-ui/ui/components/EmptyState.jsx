import PropTypes from "prop-types";

function EmptyState({
    title,
    description,
    action
}) {

    return (
        <div className="gbs-empty-state">

            <h3>
                {title}
            </h3>

            <p>
                {description}
            </p>

            {action}

        </div>
    );
}

EmptyState.propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    action: PropTypes.node
};

EmptyState.defaultProps = {
    title: "Nothing Found",
    description: "",
    action: null
};

export default EmptyState;