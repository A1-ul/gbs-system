import PropTypes from "prop-types";

function Modal({
    open,
    title,
    children,
    onClose
}) {

    if (!open) {
        return null;
    }

    return (
        <div className="gbs-modal-overlay">

            <div className="gbs-modal">

                <div className="gbs-modal-header">

                    <h3>
                        {title}
                    </h3>

                    <button
                        onClick={onClose}
                    >
                        ×
                    </button>

                </div>

                <div className="gbs-modal-body">
                    {children}
                </div>

            </div>

        </div>
    );
}

Modal.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.string,
    children: PropTypes.node,
    onClose: PropTypes.func
};

export default Modal;