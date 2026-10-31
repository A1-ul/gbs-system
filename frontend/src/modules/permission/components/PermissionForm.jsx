import React from "react";

import Input from "../../shared/ui/Input";
import Button from "../../shared/ui/Button";

const PermissionForm = ({
    values,
    errors = {},
    loading = false,
    onChange,
    onSubmit,
    submitLabel = "Save"
}) => {
    return (
        <form
            onSubmit={onSubmit}
            className="
                bg-white
                rounded-xl
                border
                p-6
                space-y-4
            "
        >
            <Input
                label="Permission Name"
                value={values.name || ""}
                error={errors.name}
                onChange={(e) =>
                    onChange(
                        "name",
                        e.target.value
                    )
                }
            />

            <Input
                label="Permission Code"
                value={values.code || ""}
                error={errors.code}
                onChange={(e) =>
                    onChange(
                        "code",
                        e.target.value
                    )
                }
            />

            <Input
                label="Description"
                value={
                    values.description || ""
                }
                error={
                    errors.description
                }
                onChange={(e) =>
                    onChange(
                        "description",
                        e.target.value
                    )
                }
            />

            <Button
                type="submit"
                disabled={loading}
            >
                {loading
                    ? "Processing..."
                    : submitLabel}
            </Button>
        </form>
    );
};

export default PermissionForm;