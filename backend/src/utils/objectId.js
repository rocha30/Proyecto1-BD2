const { ObjectId } = require("mongodb");

function toObjectId(id, fieldName = "id") {
  if (!ObjectId.isValid(id)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.status = 400;
    throw error;
  }
  return new ObjectId(id);
}

module.exports = {
  toObjectId
};
