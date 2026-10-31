import { useState } from "react";

function PasswordField({
    value,
    onChange,
    name = "password",
    placeholder = "Password"
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <input
                type={
                    visible
                        ? "text"
                        : "password"
                }
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />

            <button
                type="button"
                onClick={() =>
                    setVisible(
                        !visible
                    )
                }
            >
                {visible ? "Hide" : "Show"}
            </button>
        </div>
    );
}

export default PasswordField;