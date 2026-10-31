"use strict";

const EventEmitter = require("events");
class WorkflowEmitter extends EventEmitter {}
module.exports = new WorkflowEmitter();
