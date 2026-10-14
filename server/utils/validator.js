const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

const isValidDate = (date) => {
  if (!date) return false;
  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
};

const isValidObjectId = (id) => {
  if (!id) return false;
  if (typeof id === "string") {
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
  return id && typeof id === "object" && typeof id.toString === "function" && /^[0-9a-fA-F]{24}$/.test(id.toString());
};

const isNonEmptyString = (str) => {
  return typeof str === "string" && str.trim().length > 0;
};

const isValidNumber = (val, min, max) => {
  if (val === undefined || val === null || val === "") return true;
  const num = Number(val);
  if (isNaN(num)) return false;
  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;
  return true;
};

module.exports = {
  isValidEmail,
  isValidDate,
  isValidObjectId,
  isNonEmptyString,
  isValidNumber,
};
