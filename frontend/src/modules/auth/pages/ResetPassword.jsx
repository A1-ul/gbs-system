import { useState } from "react";

import { resetPassword } from "../api/auth.api";
import { AuthLayout } from "../../base";

function ResetPassword() {
    const [password, setPassword] =
        useState("");

    const submit =
        async (event) => {
            event.preventDefault();

            await resetPassword({
                password
            });
        };

    return (
        <AuthLayout>
            <form onSubmit={submit}>
                <h2>
                    Reset Password
                </h2>

                <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                        setPassword(
                            e.target.value
                        )
                    }
                    required
                />

                <button
                    type="submit"
                >
                    Reset Password
                </button>
            </form>
        </AuthLayout>
    );
}

export default ResetPassword;