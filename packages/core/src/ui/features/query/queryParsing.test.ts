import { describe, expect, it } from "vitest";

import type { ContainerInfo } from "../../api/types";
import { parseQuery } from "./queryParsing";

const postsCollection: ContainerInfo = {
  name: "posts",
  type: "collection"
};

describe("queryParsing", () => {
  it("parses Compass-style aggregation pipeline arrays", () => {
    const result = parseQuery(
      "mongo",
      `[
        { $group: { _id: '$userId', postCount: { $sum: 1 } } },
        { $sort: { postCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      ]`,
      postsCollection,
      100
    );

    expect(result).toEqual({
      collection: "posts",
      operation: "aggregate",
      pipeline: [
        { $group: { _id: "$userId", postCount: { $sum: 1 } } },
        { $sort: { postCount: -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } }
      ],
      limit: 100
    });
  });

  it("parses Compass-style filter objects as find queries", () => {
    const result = parseQuery("mongo", "{ status: 'published' }", postsCollection, 25);

    expect(result).toEqual({
      collection: "posts",
      operation: "find",
      filter: { status: "published" },
      limit: 25
    });
  });

  it("keeps explicit Mongo query input objects", () => {
    const result = parseQuery(
      "mongo",
      "{ collection: 'users', operation: 'aggregate', pipeline: [{ $match: { active: true } }] }",
      postsCollection,
      25
    );

    expect(result).toEqual({
      collection: "users",
      operation: "aggregate",
      pipeline: [{ $match: { active: true } }]
    });
  });
});
