const express = require("express");
const { Client } = require("pg");
const { graphqlHTTP } = require("express-graphql");
const joinMonster = require("join-monster");
const graphql = require("graphql");
const bcrypt = require("bcryptjs");
const cfg = require("./config.js");

const User = require("./models/user.js");

const client = new Client({
  host: cfg.host,
  user: cfg.dbUser,
  password: cfg.dbUserPassword,
  database: cfg.dbName,
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
      args: {
        email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
      },
      extensions: {
        joinMonster: {
          where: (usersTable, args, context) => {
            return `${usersTable}.email = ${args.email}`;
          },
        },
      },
      resolve: (parent, args, context, resolveInfo) => {
        return joinMonster.default(resolveInfo, {}, (sql) => {
          console.log(sql);
          return client.query(sql);
        });
      },
    },
    loginUser: {
      type: User,
      args: {
        email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
        password: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
      },
      resolve: async (parent, args, context, resolveInfo) => {
        try {
          const dbResponse = await client.query(
            `SELECT FROM users WHERE email = '${args.email}' RETURNING *`
          );

          console.log(dbResponse.rows[0]);

          return dbResponse;
        } catch (err) {
          throw new Error(err);
        }
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
        email: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
        phone: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
        password: { type: new graphql.GraphQLNonNull(graphql.GraphQLString) },
      },
      resolve: async (parent, args, context, resolveInfo) => {
        try {
          const hashedPassword = await bcrypt.hash(args.password, 12);

          const dbResponse = await client.query(
            "INSERT INTO users (name, email, phone, password) VALUES ($1, $2, $3, $4) RETURNING *",
            [args.name, args.email, args.phone, hashedPassword]
          );

          return dbResponse.rows[0];
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

app.listen(cfg.port);
