import { useState } from "react";
import { forgotPassword } from "../api/auth.api";
import { AuthLayout } from "../../base";

function ForgotPassword() {
    const [email, setEmail] =
        useState("");

    const submit =
        async (event) => {
            event.preventDefault();

            await forgotPassword({
                email
            });
        };

    return (
        <AuthLayout>
            <form onSubmit={submit}>
                <h2>
                    Forgot Password
                </h2>

                <input
                    type="email"
                    value={email}
                    onChange={(e) =>
                        setEmail(
                            e.target.value
                        )
                    }
                    required
                />

                <button
                    type="submit"
                >
                    Send Link
                </button>
            </form>
        </AuthLayout>
    );
}

export default ForgotPassword;