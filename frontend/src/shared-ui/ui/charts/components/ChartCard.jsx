import PropTypes from "prop-types";

function ChartCard({
    title,
    children
}) {

    return (
        <div className="gbs-chart-card">

            <div className="gbs-chart-header">
                <h4>
                    {title}
                </h4>
            </div>

            <div className="gbs-chart-content">
                {children}
            </div>

        </div>
    );
}

ChartCard.propTypes = {
    title: PropTypes.string,
    children: PropTypes.node
};

ChartCard.defaultProps = {
    title: "",
    children: null
};

export default ChartCard;