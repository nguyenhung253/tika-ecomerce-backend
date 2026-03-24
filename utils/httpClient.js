"use strict";

const https = require("https");

const sendHttpRequest = ({
  url,
  method = "GET",
  headers = {},
  body = "",
}) => {
  return new Promise((resolve, reject) => {
    const request = https.request(url, { method, headers }, (response) => {
      let responseBody = "";

      response.on("data", (chunk) => {
        responseBody += chunk;
      });

      response.on("end", () => {
        const contentType = response.headers["content-type"] || "";
        let parsedBody = responseBody;

        if (contentType.includes("application/json")) {
          try {
            parsedBody = responseBody ? JSON.parse(responseBody) : {};
          } catch (error) {
            return reject(error);
          }
        }

        resolve({
          statusCode: response.statusCode || 500,
          headers: response.headers,
          body: parsedBody,
        });
      });
    });

    request.on("error", reject);

    if (body) {
      request.write(body);
    }

    request.end();
  });
};

module.exports = {
  sendHttpRequest,
};
