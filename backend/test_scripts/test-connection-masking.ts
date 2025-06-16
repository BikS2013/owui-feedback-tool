import { maskConnectionString, maskAgentConnectionString, maskAgentsConnectionStrings } from '../src/utils/connectionStringMasker.js';

// Test data
const testCases = [
  {
    name: 'PostgreSQL with username and password',
    input: 'postgresql://myuser:mypassword123@localhost:5432/mydb',
    expected: 'postgresql://m***r:********@localhost:5432/mydb'
  },
  {
    name: 'PostgreSQL with short username',
    input: 'postgresql://db:secret@localhost:5432/mydb',
    expected: 'postgresql://db:********@localhost:5432/mydb'
  },
  {
    name: 'PostgreSQL with single char username',
    input: 'postgresql://a:password@localhost:5432/mydb',
    expected: 'postgresql://*:********@localhost:5432/mydb'
  },
  {
    name: 'Generic protocol with credentials',
    input: 'mysql://admin:admin123@192.168.1.1:3306/database',
    expected: 'mysql://a***n:********@192.168.1.1:3306/database'
  },
  {
    name: 'Connection string with only username',
    input: 'postgresql://username@localhost:5432/mydb',
    expected: 'postgresql://u******e@localhost:5432/mydb'
  },
  {
    name: 'Invalid connection string',
    input: 'not a connection string',
    expected: 'not a connection string'
  }
];

console.log('Testing connection string masking utility...\n');

// Test individual connection strings
testCases.forEach(testCase => {
  const result = maskConnectionString(testCase.input);
  const passed = result === testCase.expected;
  console.log(`Test: ${testCase.name}`);
  console.log(`Input:    ${testCase.input}`);
  console.log(`Expected: ${testCase.expected}`);
  console.log(`Result:   ${result}`);
  console.log(`Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('---');
});

// Test Agent object masking
console.log('\nTesting Agent object masking...\n');

const testAgent = {
  name: 'Test Agent',
  url: 'http://localhost:3001/api/test',
  database_connection_string: 'postgresql://testuser:testpass123@localhost:5432/testdb'
};

const maskedAgent = maskAgentConnectionString(testAgent);
console.log('Original Agent:', testAgent);
console.log('Masked Agent:', maskedAgent);
console.log('---');

// Test multiple agents masking
console.log('\nTesting multiple agents masking...\n');

const testAgents = [
  {
    name: 'Agent 1',
    url: 'http://localhost:3001/api/agent1',
    database_connection_string: 'postgresql://user1:pass1@localhost:5432/db1'
  },
  {
    name: 'Agent 2',
    url: 'http://localhost:3001/api/agent2',
    database_connection_string: 'postgresql://user2:pass2@localhost:5432/db2'
  }
];

const maskedAgents = maskAgentsConnectionStrings(testAgents);
console.log('Original Agents:', JSON.stringify(testAgents, null, 2));
console.log('Masked Agents:', JSON.stringify(maskedAgents, null, 2));