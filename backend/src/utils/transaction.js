const { startSession } = require("../db");

/**
 * Runs `work(session)` inside a MongoDB transaction.
 * Falls back to running without a transaction when the deployment
 * does not support them (standalone, un-initialised replica set, etc.).
 */
async function runWithOptionalTransaction(work) {
  const session = startSession();
  try {
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    try {
      await session.abortTransaction();
    } catch (_abortError) {
      // no-op
    }

    const unsupportedTransaction = /Transaction numbers are only allowed|replica set|mongos/i.test(error.message);
    if (!unsupportedTransaction) {
      throw error;
    }

    return work(undefined);
  } finally {
    await session.endSession();
  }
}

module.exports = { runWithOptionalTransaction };
