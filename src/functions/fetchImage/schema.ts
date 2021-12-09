export default {
  type: "object",
  properties: {
    url: { type: "string" },
    feed: { type: "string" },
  },
  required: ["url", "feed"],
} as const;
