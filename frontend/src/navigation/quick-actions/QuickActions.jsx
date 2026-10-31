import PropTypes from "prop-types";

function QuickActions({
    actions
}) {

    return (
        <div className="gbs-quick-actions">

            <h4>
                Quick Actions
            </h4>

            <div>

                {
                    actions.map(
                        (action) => (
                            <button
                                key={action.id}
                                type="button"
                                onClick={
                                    action.onClick
                                }
                            >
                                {action.label}
                            </button>
                        )
                    )
                }

            </div>

        </div>
    );
}

QuickActions.propTypes = {
    actions: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.number
            ]),
            label: PropTypes.string,
            onClick: PropTypes.func
        })
    )
};

QuickActions.defaultProps = {
    actions: []
};

export default QuickActions;