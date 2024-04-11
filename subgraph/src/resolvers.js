const resolvers = {
  Query: {
    hello: () => {
      return "Hello World basic!";
    },
    helloAuthN: () => {
      return "Hello World authn!";
    },
    helloAuthZ: () => {
      return "Hello World authz!";
    },
  },
};

export default resolvers;
