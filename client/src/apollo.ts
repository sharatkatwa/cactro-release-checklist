import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

const graphqlUri =
  import.meta.env.VITE_GRAPHQL_URL ||
  (import.meta.env.PROD ? '/graphql' : 'http://localhost:4000/graphql');

const httpLink = new HttpLink({
  uri: graphqlUri,
});

export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          releases: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
    },
  }),
});
