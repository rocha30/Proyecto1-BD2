const RESERVED = new Set([
  "sort",
  "order",
  "skip",
  "limit",
  "fields",
  "projection",
  "filter",
  "q"
]);

const OPERATOR_MAP = {
  gte: "$gte",
  lte: "$lte",
  gt: "$gt",
  lt: "$lt",
  ne: "$ne",
  in: "$in",
  nin: "$nin"
};

function parsePrimitive(rawValue) {
  const value = String(rawValue).trim();
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value === "null") {
    return null;
  }
  if (!Number.isNaN(Number(value)) && value !== "") {
    return Number(value);
  }
  const dateCandidate = new Date(value);
  if (!Number.isNaN(dateCandidate.getTime()) && /\d{4}-\d{2}-\d{2}/.test(value)) {
    return dateCandidate;
  }
  return value;
}

function parseList(rawValue) {
  return String(rawValue)
    .split(",")
    .map((item) => parsePrimitive(item))
    .filter((item) => item !== "");
}

function safeJsonParse(rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch (_error) {
    return null;
  }
}

function parseFilter(queryParams) {
  const filter = {};

  if (queryParams.filter) {
    const parsed = safeJsonParse(queryParams.filter);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      Object.assign(filter, parsed);
    }
  }

  for (const [key, rawValue] of Object.entries(queryParams)) {
    if (RESERVED.has(key) || rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    const operatorMatch = key.match(/^(.+)_(gte|lte|gt|lt|ne|in|nin)$/);
    if (operatorMatch) {
      const [, field, opKey] = operatorMatch;
      const mongoOperator = OPERATOR_MAP[opKey];
      if (!filter[field] || typeof filter[field] !== "object") {
        filter[field] = {};
      }
      filter[field][mongoOperator] = opKey === "in" || opKey === "nin"
        ? parseList(rawValue)
        : parsePrimitive(rawValue);
      continue;
    }

    if (String(rawValue).includes(",")) {
      filter[key] = { $in: parseList(rawValue) };
      continue;
    }

    filter[key] = parsePrimitive(rawValue);
  }

  return filter;
}

function parseSort(queryParams, defaultSort = { createdAt: -1 }) {
  if (!queryParams.sort) {
    return defaultSort;
  }

  const directionFromOrder = queryParams.order === "asc" ? 1 : -1;
  const sort = {};

  for (const token of String(queryParams.sort).split(",")) {
    const field = token.trim();
    if (!field) {
      continue;
    }
    if (field.startsWith("-")) {
      sort[field.slice(1)] = -1;
    } else if (field.startsWith("+")) {
      sort[field.slice(1)] = 1;
    } else {
      sort[field] = directionFromOrder;
    }
  }

  if (Object.keys(sort).length === 0) {
    return defaultSort;
  }

  return sort;
}

function parseProjection(queryParams) {
  const raw = queryParams.fields || queryParams.projection;
  if (!raw) {
    return undefined;
  }

  const projection = {};

  for (const token of String(raw).split(",")) {
    const field = token.trim();
    if (!field) {
      continue;
    }
    if (field.startsWith("-")) {
      projection[field.slice(1)] = 0;
    } else {
      projection[field.replace(/^\+/, "")] = 1;
    }
  }

  return Object.keys(projection).length > 0 ? projection : undefined;
}

function parseSkip(queryParams) {
  const skip = Number.parseInt(queryParams.skip, 10);
  if (Number.isNaN(skip) || skip < 0) {
    return 0;
  }
  return skip;
}

function parseLimit(queryParams, fallback = 20, max = 100) {
  const hasLimitParam = queryParams.limit !== undefined && queryParams.limit !== null && String(queryParams.limit).trim() !== "";
  const limit = Number.parseInt(queryParams.limit, 10);

  if (!hasLimitParam || Number.isNaN(limit) || limit <= 0) {
    return fallback;
  }

  if (typeof max !== "number" || !Number.isFinite(max) || max <= 0) {
    return limit;
  }

  return Math.min(limit, max);
}

function buildFindConfig(queryParams, defaultSort = { createdAt: -1 }, limitConfig = {}) {
  const {
    limitFallback = 20,
    limitMax = 100
  } = limitConfig;
  const limit = parseLimit(queryParams, limitFallback, limitMax);

  const options = {
    sort: parseSort(queryParams, defaultSort),
    skip: parseSkip(queryParams),
    projection: parseProjection(queryParams)
  };

  if (limit !== undefined) {
    options.limit = limit;
  }

  return {
    filter: parseFilter(queryParams),
    options
  };
}

module.exports = {
  buildFindConfig,
  parseFilter,
  parseLimit,
  parseProjection,
  parseSkip,
  parseSort
};
