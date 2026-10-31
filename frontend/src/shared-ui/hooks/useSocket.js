import {
    useContext
}
from "react";

import {
    SocketContext
}
from "../../app/providers/SocketProvider";

export default function useSocket() {

    const socket =
        useContext(
            SocketContext
        );

    return socket;
}