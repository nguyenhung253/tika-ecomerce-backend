"use strict";
const express = require("express");
const AccessController = require("../controllers/access.controller");

const router = express.Router();

// Sign up
router.post("/signup", AccessController.signUp);

// Login
router.post("/login", AccessController.login);

module.exports = router;
