const graphql = require("graphql");

const User = new graphql.GraphQLObjectType({
  name: "User",
  extensions: {
    joinMonster: {
      sqlTable: 'public."users"',
      uniqueKey: "email",
    },
  },
  fields: () => ({
    name: { type: graphql.GraphQLString },
    email: { type: graphql.GraphQLString },
    phone: { type: graphql.GraphQLString },
    password: { type: graphql.GraphQLString },
  }),
});

User._typeConfig = {
  sqlTable: "users",
  uniqueKey: "email",
};

module.exports = User;
