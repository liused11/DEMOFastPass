// apollo.config.ts
import { ApolloClientOptions, InMemoryCache, split } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
export function createApollo(httpLink: HttpLink): ApolloClientOptions {
  // 🔹 HTTP (query / mutation)
  const http = httpLink.create({
    uri: 'http://localhost:3000/graphql',
    withCredentials: false, // true ถ้าใช้ cookie auth
  });

  // 🔹 WS (subscription)
  const ws = new GraphQLWsLink(
    createClient({
      url: 'ws://localhost:3000/graphql',
      retryAttempts: Infinity,
    })
  );

  // 🔥 split query vs subscription
  const link = split(
    ({ query }) => {
      const def = getMainDefinition(query);
      return (
        def.kind === 'OperationDefinition' &&
        def.operation === 'subscription'
      );
    },
    ws,
    http
  );
  return {
    link,
    cache: new InMemoryCache(),
  };
}