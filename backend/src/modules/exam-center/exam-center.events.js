"use strict";

const EventEmitter = require("events");
class ModuleEmitter extends EventEmitter {}
module.exports = new ModuleEmitter();
