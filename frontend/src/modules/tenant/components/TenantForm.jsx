import { useState } from "react";

function TenantForm({
    initialValues = {},
    onSubmit
}) {
    const [form, setForm] =
        useState({
            name:
                initialValues.name ||
                "",
            email:
                initialValues.email ||
                "",
            status:
                initialValues.status ||
                "ACTIVE"
        });

    const handleChange = (
        event
    ) => {
        setForm({
            ...form,
            [event.target.name]:
                event.target.value
        });
    };

    const submit = (
        event
    ) => {
        event.preventDefault();

        onSubmit(form);
    };

    return (
        <form onSubmit={submit}>
            <input
                name="name"
                placeholder="Tenant Name"
                value={form.name}
                onChange={handleChange}
                required
            />

            <input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
            />

            <select
                name="status"
                value={form.status}
                onChange={handleChange}
            >
                <option value="ACTIVE">
                    ACTIVE
                </option>

                <option value="INACTIVE">
                    INACTIVE
                </option>
            </select>

            <button
                type="submit"
            >
                Save Tenant
            </button>
        </form>
    );
}

export default TenantForm;