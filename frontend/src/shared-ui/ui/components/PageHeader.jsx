import PropTypes from "prop-types";

function PageHeader({
    title,
    subtitle,
    actions
}) {

    return (
        <div className="gbs-page-header">

            <div>

                <h1>
                    {title}
                </h1>

                <p>
                    {subtitle}
                </p>

            </div>

            <div>
                {actions}
            </div>

        </div>
    );
}

PageHeader.propTypes = {
    title: PropTypes.string,
    subtitle: PropTypes.string,
    actions: PropTypes.node
};

PageHeader.defaultProps = {
    title: "",
    subtitle: "",
    actions: null
};

export default PageHeader;