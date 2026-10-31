import { useState } from "react";

import PasswordField from "./PasswordField";
import { login } from "../api/auth.api";

function LoginForm({
    role = "admin"
}) {
    const [loading, setLoading] =
        useState(false);

    const [form, setForm] =
        useState({
            email: "",
            password: "",
            role
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

    const handleSubmit =
        async (event) => {
            event.preventDefault();

            try {
                setLoading(true);

                await login(form);
            } finally {
                setLoading(false);
            }
        };

    return (
        <form
            onSubmit={
                handleSubmit
            }
        >
            <input
                type="email"
                name="email"
                value={form.email}
                onChange={
                    handleChange
                }
                placeholder="Email"
                required
            />

            <PasswordField
                value={
                    form.password
                }
                onChange={
                    handleChange
                }
            />

            <button
                type="submit"
                disabled={loading}
            >
                {loading
                    ? "Signing In..."
                    : "Sign In"}
            </button>
        </form>
    );
}

export default LoginForm;