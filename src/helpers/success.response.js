"use strict";

const StatusCode = {
  OK: 200,
  CREATED: 201,
};

const ReasonStatusCode = {
  OK: "Success",
  CREATED: "Created",
};

class SuccessResponse {
  constructor({
    message,
    statusCode = StatusCode.OK,
    reasonStatusCode = ReasonStatusCode.OK,
    data = {},
  }) {
    this.message = message || reasonStatusCode;
    this.status = statusCode;
    this.data = data;
  }

  send(res) {
    return res.status(this.status).json(this);
  }
}

class OK extends SuccessResponse {
  constructor({ message, data }) {
    super({ message, data });
  }
}

class CREATED extends SuccessResponse {
  constructor({
    message = ReasonStatusCode.CREATED,
    statusCode = StatusCode.CREATED,
    data,
  }) {
    super({ message, statusCode, data });
  }
}

module.exports = {
  OK,
  CREATED,
  SuccessResponse,
};
