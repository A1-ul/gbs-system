import { useState } from "react";

import Input from "../../shared/ui/Input";
import Button from "../../shared/ui/Button";

export default function TeacherForm({
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

            employeeId:
                initialValues.employeeId ||
                "",

            department:
                initialValues.department ||
                "",

            subject:
                initialValues.subject ||
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
                name="employeeId"
                placeholder="Employee ID"
                value={form.employeeId}
                onChange={handleChange}
            />

            <Input
                name="department"
                placeholder="Department"
                value={form.department}
                onChange={handleChange}
            />

            <Input
                name="subject"
                placeholder="Subject"
                value={form.subject}
                onChange={handleChange}
            />

            <Button
                type="submit"
                loading={loading}
            >
                Save Teacher
            </Button>
        </form>
    );
}