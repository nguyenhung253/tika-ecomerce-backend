"use strict";

const { getRedis } = require("../../configs/init.redis");

const DEFAULT_TTL = 300;

const getCache = async (key) => {
  const client = getRedis();
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
};

const setCache = async (key, value, ttl = DEFAULT_TTL) => {
  const client = getRedis();
  await client.set(key, JSON.stringify(value), { EX: ttl });
};

const deleteCache = async (key) => {
  const client = getRedis();
  await client.del(key);
};

const deleteByPattern = async (pattern) => {
  const client = getRedis();
  const keys = [];

  for await (const key of client.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  })) {
    keys.push(key);
  }

  if (keys.length) {
    await client.del(keys);
  }
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteByPattern,
};
