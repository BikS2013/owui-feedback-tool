#!/usr/bin/env node

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to format JSON output
function logJson(label, data) {
  console.log(`\n${label}:`);
  console.log(JSON.stringify(data, null, 2));
}

// Helper function to log request details
function logRequest(method, url, params = null, body = null) {
  console.log('\n' + '='.repeat(80));
  console.log(`REQUEST: ${method} ${url}`);
  if (params) {
    console.log('QUERY PARAMS:', params);
  }
  if (body) {
    console.log('REQUEST BODY:', JSON.stringify(body, null, 2));
  }
}

// Helper function to log response details
function logResponse(response) {
  console.log('\nRESPONSE STATUS:', response.status);
  console.log('RESPONSE HEADERS:', {
    'content-type': response.headers['content-type'],
    'content-length': response.headers['content-length']
  });
  logJson('RESPONSE BODY', response.data);
}

async function testAgentAPI() {
  console.log('='.repeat(80));
  console.log('AGENT API TEST FLOW');
  console.log('='.repeat(80));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Start Time: ${new Date().toISOString()}`);

  try {
    // Step 1: Get all configured agents
    console.log('\n\nSTEP 1: RETRIEVE ALL CONFIGURED AGENTS');
    console.log('-'.repeat(80));
    
    const agentsUrl = `${API_BASE_URL}/agent`;
    logRequest('GET', agentsUrl);
    
    const agentsResponse = await axios.get(agentsUrl);
    logResponse(agentsResponse);
    
    const agents = agentsResponse.data.agents;
    
    if (!agents || agents.length === 0) {
      console.log('\nNo agents found. Exiting test.');
      return;
    }
    
    // Use the first agent
    const firstAgent = agents[0];
    console.log(`\nSelected first agent: "${firstAgent.name}"`);
    
    // Step 2: Get threads for the first agent
    console.log('\n\nSTEP 2: RETRIEVE LAST 20 THREADS FOR FIRST AGENT');
    console.log('-'.repeat(80));
    
    const threadsUrl = `${API_BASE_URL}/agent/threads`;
    const threadsParams = {
      agentName: firstAgent.name,
      page: 1,
      limit: 20
    };
    
    logRequest('GET', threadsUrl, threadsParams);
    
    const threadsResponse = await axios.get(threadsUrl, { params: threadsParams });
    logResponse(threadsResponse);
    
    const threads = threadsResponse.data.data.threads;
    
    if (!threads || threads.length === 0) {
      console.log('\nNo threads found for agent. Exiting test.');
      return;
    }
    
    // Use the first thread
    const firstThread = threads[0];
    console.log(`\nSelected first thread: "${firstThread.thread_id}"`);
    console.log(`Thread created at: ${firstThread.created_at}`);
    
    // Step 3: Get documents for the first thread
    console.log('\n\nSTEP 3: RETRIEVE DOCUMENTS FOR FIRST THREAD');
    console.log('-'.repeat(80));
    
    const documentsUrl = `${API_BASE_URL}/agent/thread/${firstThread.thread_id}/documents`;
    const documentsParams = {
      agentName: firstAgent.name
    };
    
    logRequest('GET', documentsUrl, documentsParams);
    
    const documentsResponse = await axios.get(documentsUrl, { params: documentsParams });
    logResponse(documentsResponse);
    
    const documents = documentsResponse.data.documents;
    console.log(`\nFound ${documents ? documents.length : 0} documents for thread`);
    
    // Summary
    console.log('\n\nTEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✓ Retrieved ${agents.length} agents`);
    console.log(`✓ Retrieved ${threads.length} threads for agent "${firstAgent.name}"`);
    console.log(`✓ Retrieved ${documents ? documents.length : 0} documents for thread "${firstThread.thread_id}"`);
    console.log(`\nEnd Time: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('\n\nERROR OCCURRED:');
    console.error('-'.repeat(80));
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Response Status:', error.response.status);
      console.error('Response Headers:', error.response.headers);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error Message:', error.message);
    }
  }
}

// Run the test
console.log('Starting Agent API Test...\n');
testAgentAPI();