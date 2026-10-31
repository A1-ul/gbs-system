import { Link } from "react-router-dom";

function Unauthorized() {

    return (
        <div
            style={{
                padding: "40px",
                textAlign: "center"
            }}
        >
            <h1>
                Access Denied
            </h1>

            <p>
                You do not have permission
                to access this page.
            </p>

            <Link to="/">
                Return Home
            </Link>
        </div>
    );
}

export default Unauthorized;