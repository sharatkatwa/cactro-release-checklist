export const typeDefs = `#graphql
  enum ReleaseStatus {
    PLANNED
    ONGOING
    DONE
  }

  type Step {
    id: ID!
    title: String!
    order: Int!
  }

  type Release {
    id: ID!
    name: String!
    date: String!
    status: ReleaseStatus!
    additionalInfo: String
    completedSteps: [String!]!
    createdAt: String!
    updatedAt: String!
  }

  input CreateReleaseInput {
    name: String!
    date: String!
    additionalInfo: String
    completedSteps: [String!]
  }

  input UpdateReleaseInput {
    name: String
    date: String
    additionalInfo: String
    completedSteps: [String!]
  }

  type Query {
    releases: [Release!]!
    release(id: ID!): Release
    steps: [Step!]!
  }

  type Mutation {
    createRelease(input: CreateReleaseInput!): Release!
    updateRelease(id: ID!, input: UpdateReleaseInput!): Release!
    toggleStep(id: ID!, stepId: String!, completed: Boolean!): Release!
    deleteRelease(id: ID!): Boolean!
  }
`;
