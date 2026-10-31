import { useState } from "react";

import Input from "../../shared/ui/Input";
import Button from "../../shared/ui/Button";

export default function StudentForm({
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

            admissionNumber:
                initialValues.admissionNumber ||
                "",

            className:
                initialValues.className ||
                ""
        });

    const handleChange = (
        event
    ) => {
        const {
            name,
            value
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    const handleSubmit = (
        event
    ) => {
        event.preventDefault();

        if (
            typeof onSubmit ===
            "function"
        ) {
            onSubmit(form);
        }
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

            <Input
                name="admissionNumber"
                placeholder="Admission Number"
                value={
                    form.admissionNumber
                }
                onChange={handleChange}
            />

            <Input
                name="className"
                placeholder="Class"
                value={form.className}
                onChange={handleChange}
            />

            <Button
                type="submit"
                loading={loading}
            >
                Save Student
            </Button>
        </form>
    );
}