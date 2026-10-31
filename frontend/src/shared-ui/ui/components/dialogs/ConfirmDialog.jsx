import PropTypes from "prop-types";
import Modal from "../ui/Modal";
import Button from "../ui/Button";

function ConfirmDialog({
    open,
    title,
    message,
    confirmText,
    cancelText,
    loading,
    onConfirm,
    onCancel
}) {

    return (
        <Modal
            isOpen={open}
            onClose={onCancel}
        >

            <div className="gbs-confirm-dialog">

                <h3>
                    {title}
                </h3>

                <p>
                    {message}
                </p>

                <div
                    className="gbs-confirm-actions"
                >

                    <Button
                        variant="secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelText}
                    </Button>

                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmText}
                    </Button>

                </div>

            </div>

        </Modal>
    );
}

ConfirmDialog.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.string,
    message: PropTypes.string,
    confirmText: PropTypes.string,
    cancelText: PropTypes.string,
    loading: PropTypes.bool,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func
};

ConfirmDialog.defaultProps = {
    open: false,
    title: "Confirm Action",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    loading: false,
    onConfirm: () => {},
    onCancel: () => {}
};

export default ConfirmDialog;