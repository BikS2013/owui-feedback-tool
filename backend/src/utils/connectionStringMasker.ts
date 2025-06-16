/**
 * Masks sensitive information (username and password) in database connection strings
 */
export function maskConnectionString(connectionString: string): string {
  try {
    // Handle PostgreSQL connection string format: postgresql://username:password@host:port/database
    const postgresMatch = connectionString.match(/^(postgresql:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (postgresMatch) {
      const [, protocol, username, password, rest] = postgresMatch;
      const maskedUsername = username.length > 2 ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1] : username.length === 2 ? username : '*'.repeat(username.length);
      const maskedPassword = '*'.repeat(8);
      return `${protocol}${maskedUsername}:${maskedPassword}@${rest}`;
    }

    // Handle generic connection string format: protocol://username:password@host...
    const genericMatch = connectionString.match(/^([^:]+:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (genericMatch) {
      const [, protocol, username, password, rest] = genericMatch;
      const maskedUsername = username.length > 2 ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1] : username.length === 2 ? username : '*'.repeat(username.length);
      const maskedPassword = '*'.repeat(8);
      return `${protocol}${maskedUsername}:${maskedPassword}@${rest}`;
    }

    // Handle connection strings with @ but no password (just username)
    const usernameOnlyMatch = connectionString.match(/^([^:]+:\/\/)([^@]+)@(.+)$/);
    if (usernameOnlyMatch) {
      const [, protocol, username, rest] = usernameOnlyMatch;
      const maskedUsername = username.length > 2 ? username[0] + '*'.repeat(username.length - 2) + username[username.length - 1] : username.length === 2 ? username : '*'.repeat(username.length);
      return `${protocol}${maskedUsername}@${rest}`;
    }

    // If no pattern matches, return the original string (might not be a connection string)
    return connectionString;
  } catch (error) {
    // In case of any error, return the original string to avoid breaking the API
    console.error('Error masking connection string:', error);
    return connectionString;
  }
}

/**
 * Masks connection strings in an Agent object
 */
export function maskAgentConnectionString<T extends { database_connection_string: string }>(agent: T): T {
  return {
    ...agent,
    database_connection_string: maskConnectionString(agent.database_connection_string)
  };
}

/**
 * Masks connection strings in an array of Agent objects
 */
export function maskAgentsConnectionStrings<T extends { database_connection_string: string }>(agents: T[]): T[] {
  return agents.map(agent => maskAgentConnectionString(agent));
}