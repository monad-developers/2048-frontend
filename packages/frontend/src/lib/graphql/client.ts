import { GraphQLClient } from 'graphql-request';

// Get GraphQL endpoint from environment variables
const GRAPHQL_URL = import.meta.env.VITE_ENVIO_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';

let client: GraphQLClient | null = null;

export function getGraphQLClient(): GraphQLClient {
  if (!client) {
    client = new GraphQLClient(GRAPHQL_URL, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
  return client;
}

// Reset client (useful for testing or changing endpoints)
export function resetGraphQLClient(): void {
  client = null;
}
