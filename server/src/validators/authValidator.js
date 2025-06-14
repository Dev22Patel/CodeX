const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(20).alphanum().required(),
  password: Joi.string().min(6).max(128).required()
});

const loginSchema = Joi.object({
  login: Joi.string().required(), // Can be email or username
  password: Joi.string().required()
});

const validateRegister = (data) => {
  return registerSchema.validate(data);
};

const validateLogin = (data) => {
  return loginSchema.validate(data);
};

module.exports = {
  validateRegister,
  validateLogin
};
