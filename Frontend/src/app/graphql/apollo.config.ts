import { ApolloClientOptions, InMemoryCache } from '@apollo/client/core';
import { HttpLink } from 'apollo-angular/http';

export function createApollo(httpLink: HttpLink): ApolloClientOptions {
  return {
    link: httpLink.create({
      uri: 'http://localhost:3000/graphql', // 🔁 แก้เป็น API ของคุณ
      withCredentials: false, // true ถ้าใช้ cookie auth
    }),
    cache: new InMemoryCache(),
  };
}