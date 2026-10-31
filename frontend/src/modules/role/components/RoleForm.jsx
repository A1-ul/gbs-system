import React from "react";
import PropTypes from "prop-types";

import Button from "../../shared/ui/Button";
import Input from "../../shared/ui/Input";

const RoleForm = ({
    values,
    errors,
    loading,
    onChange,
    onSubmit,
    submitLabel = "Save Role"
}) => {
    const handleChange = (event) => {
        const { name, value } =
            event.target;

        onChange(name, value);
    };

    return (
        <form
            onSubmit={onSubmit}
            className="space-y-4"
        >
            <Input
                label="Role Name"
                name="name"
                value={values.name}
                onChange={handleChange}
                error={errors.name}
                required
            />

            <Input
                label="Display Name"
                name="displayName"
                value={
                    values.displayName
                }
                onChange={handleChange}
                error={
                    errors.displayName
                }
            />

            <div>
                <label
                    className="
                    block
                    mb-2
                    font-medium
                "
                >
                    Description
                </label>

                <textarea
                    name="description"
                    value={
                        values.description
                    }
                    onChange={
                        handleChange
                    }
                    rows={4}
                    className="
                    w-full
                    border
                    rounded-lg
                    p-3
                "
                />
            </div>

            <div
                className="
                flex
                justify-end
                pt-2
            "
            >
                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading
                        ? "Saving..."
                        : submitLabel}
                </Button>
            </div>
        </form>
    );
};

RoleForm.propTypes = {
    values: PropTypes.object
        .isRequired,
    errors: PropTypes.object,
    loading: PropTypes.bool,
    onChange: PropTypes.func
        .isRequired,
    onSubmit: PropTypes.func
        .isRequired,
    submitLabel:
        PropTypes.string
};

export default React.memo(
    RoleForm
);