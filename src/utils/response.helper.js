// utils/response.helper.js
export const baseResponse = (res, { code = 200, data = null, message = "", status = true }) => {
  return res.status(code).json({
    code,
    status,
    message,
    data,
  });
};
