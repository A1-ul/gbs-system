import { useState } from "react";
import Button from "../../shared/ui/Button";
import Input from "../../shared/ui/Input";

export default function StaffForm({
    initialValues = {},
    onSubmit,
    loading = false
}) {
    const [form, setForm] =
        useState({
            firstName:
                initialValues.firstName || "",

            lastName:
                initialValues.lastName || "",

            email:
                initialValues.email || "",

            phone:
                initialValues.phone || ""
        });

    const handleChange = (e) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]:
                e.target.value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        onSubmit?.(form);
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            <Input
                name="firstName"
                placeholder="First Name"
                value={form.firstName}
                onChange={handleChange}
            />

            <Input
                name="lastName"
                placeholder="Last Name"
                value={form.lastName}
                onChange={handleChange}
            />

            <Input
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
            />

            <Input
                name="phone"
                placeholder="Phone"
                value={form.phone}
                onChange={handleChange}
            />

            <Button
                type="submit"
                loading={loading}
            >
                Save Staff
            </Button>
        </form>
    );
}