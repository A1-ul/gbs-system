"use strict";

const routes = require("./cdn.routes");

module.exports = {
  name: "cdn",
  basePath: "/api/v1/cdn",
  routes,
  initialize() {
    console.log("[CDN MODULE] S3-compatible cloud object store & Global Edge CDN initialized.");
  }
};
