import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from ".";
import store from "../store/store";

import "./styles/globals.css";
import "./styles/theme.css";
import "./styles/responsive.css";
import "./styles/animations.css";
import "./styles/glass.css";

ReactDOM.createRoot(
    document.getElementById("root")
).render(

    <React.StrictMode>

        <Provider store={store}>

            <App />

        </Provider>

    </React.StrictMode>
);