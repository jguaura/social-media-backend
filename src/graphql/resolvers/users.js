const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserInputError } = require("apollo-server");

const {
  validateRegisterInput,
  validateLoginInput,
} = require("../../util/validators");
const { SECRET_KEY } = require("../../config/config");
const User = require("../../models/User");

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
    },
    SECRET_KEY,
    { expiresIn: "1h" }
  );
}
module.exports = {
  Mutation: {
    async login(_, { username, password }) {
      const { errors, valid } = validateLoginInput(username, password);

      if (!valid) {
        throw new UserInputError("Error", { errors });
      }

      const user = await User.findOne({ username });

      if (!user) {
        errors.general = "User not found";
        throw new UserInputError("User not found", { errors });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        errors.general = "Wrong credentials";
        throw new UserInputError("Wrong credentials", { errors });
      }

      const token = generateToken(user);

      return {
        ...user._doc,
        id: user._id,
        token,
      };
    },
    async register(
      _,
      { registerInput: { username, email, password, confirmedPassword } },
      context,
      info
    ) {
      const { valid, errors } = validateRegisterInput(
        username,
        email,
        password,
        confirmedPassword
      );
      if (!valid) {
        throw new UserInputError("Error", { errors });
      }

      const user = await User.findOne({ username: username });
      const mail = await User.findOne({ email: email });

      if (user) {
        throw new UserInputError("Username is already taken", {
          errors: {
            username: `The username: ${username} is already taken`,
          },
        });
      }
      if (mail) {
        throw new UserInputError(
          `An account with the email: ${email} already exist`,
          {
            errors: {
              email: "Email already exist",
            },
          }
        );
      }
      // hash password and crate auth token
      password = await bcrypt.hash(password, 12);

      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString(),
      });

      const res = await newUser.save();
      const token = generateToken(res);

      return {
        username: res.username,
        email: res.email,
        createdAt: res.createdAt,
        passowrd: res.passowrd,
        id: res._id,
        token,
      };
    },
  },
};
