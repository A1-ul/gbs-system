import { useState } from "react";

import Input from "../../shared/ui/Input";
import Button from "../../shared/ui/Button";

export default function ParentForm({
    initialValues = {},
    onSubmit,
    loading = false
}) {

    const [form, setForm] =
        useState({

            firstName:
                initialValues.firstName ||
                "",

            lastName:
                initialValues.lastName ||
                "",

            email:
                initialValues.email ||
                "",

            phone:
                initialValues.phone ||
                "",

            occupation:
                initialValues.occupation ||
                "",

            address:
                initialValues.address ||
                ""
        });

    const handleChange =
        (event) => {

            const {
                name,
                value
            } = event.target;

            setForm(
                (previous) => ({
                    ...previous,
                    [name]: value
                })
            );
        };

    const handleSubmit =
        (event) => {

            event.preventDefault();

            onSubmit?.(form);
        };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            <Input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                placeholder="First Name"
            />

            <Input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                placeholder="Last Name"
            />

            <Input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
            />

            <Input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone"
            />

            <Input
                name="occupation"
                value={form.occupation}
                onChange={handleChange}
                placeholder="Occupation"
            />

            <Input
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Address"
            />

            <Button
                type="submit"
                loading={loading}
            >
                Save Parent
            </Button>
        </form>
    );
}