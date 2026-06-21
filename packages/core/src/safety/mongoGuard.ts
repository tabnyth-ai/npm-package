const readonlyOperations = new Set(["find", "aggregate"]);
const writeOperations = new Set(["insertOne", "updateOne", "deleteOne"]);

export function assertMongoOperationAllowed(operation: string | undefined, allowWrite: boolean): void {
  if (!operation) {
    throw new Error("MongoDB operation is required.");
  }

  if (readonlyOperations.has(operation)) {
    return;
  }

  if (writeOperations.has(operation) && allowWrite) {
    return;
  }

  if (writeOperations.has(operation)) {
    throw new Error("MongoDB write operations require --allow-write.");
  }

  throw new Error(`Unsupported MongoDB operation: ${operation}`);
}
