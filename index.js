const express = require("express");
const { Client } = require("pg");
const { graphqlHTTP } = require("express-graphql");
const joinMonster = require("join-monster");
const graphql = require("graphql");

const User = new graphql.GraphQLObjectType({
  name: "User",
  extensions: {
    joinMonster: {
      sqlTable: 'public."users"',
      uniqueKey: "phone",
    },
  },
  fields: () => ({
    name: { type: graphql.GraphQLString },
    lastName: { type: graphql.GraphQLString },
    phone: { type: graphql.GraphQLString },
    password: { type: graphql.GraphQLString },
  }),
});

User._typeConfig = {
  sqlTable: "users",
  uniqueKey: "phone",
};

const client = new Client({
  host: "localhost",
  user: "postgres",
  password: "berezovka1994",
  database: "lang-learning",
});
client.connect();

const QueryRoot = new graphql.GraphQLObjectType({
  name: "Query",
  fields: () => ({
    hello: {
      type: graphql.GraphQLString,
      resolve: () => "Hello world!",
    },
    getUsers: {
      type: new graphql.GraphQLList(User),
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster.default(resolveInfo, {}, (sql) => {
          return client.query(sql);
        });
      },
    },
    getUser: {
      type: User,
      args: { id: { type: new graphql.GraphQLNonNull(graphql.GraphQLInt) } },
      extensions: {
        joinMonster: {
          where: (usersTable, args, context) => {
            return `${usersTable}.id = ${args.id}`;
          },
        },
      },
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster.default(resolveInfo, {}, (sql) => {
          return client.query(sql);
        });
      },
    },
  }),
});

const MutationRoot = new graphql.GraphQLObjectType({
  name: "Mutation",
  fields: () => ({
    registerUser: {
      type: User,
      args: {
        name: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
        lastName: {
          type: new graphql.GraphQLNonNull(graphql.GraphQLString),
          resolve: (user) => user.last_name,
        },
        phone: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
        password: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
      },
      resolve: async (parent, args, context, resolveInfo) => {
        try {
          return (
            await client.query(
              "INSERT INTO users (name, last_name, phone, password) VALUES ($1, $2, $3, $4) RETURNING *",
              [args.name, args.lastName, args.phone, args.password]
            )
          ).rows[0];
        } catch (err) {
          throw new Error(err);
        }
      },
    },
  }),
});

const schema = new graphql.GraphQLSchema({
  query: QueryRoot,
  mutation: MutationRoot,
});

const app = express();
app.use(
  "/api",
  graphqlHTTP({
    schema: schema,
    graphiql: true,
  })
);
app.listen(4000);
