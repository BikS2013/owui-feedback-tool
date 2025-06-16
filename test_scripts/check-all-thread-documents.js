#!/usr/bin/env node

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to format JSON output
function logJson(label, data) {
  console.log(`\n${label}:`);
  console.log(JSON.stringify(data, null, 2));
}

async function checkAllThreadDocuments() {
  console.log('='.repeat(80));
  console.log('CHECKING DOCUMENTS FOR ALL THREADS');
  console.log('='.repeat(80));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Start Time: ${new Date().toISOString()}`);

  try {
    // Step 1: Get all agents
    console.log('\n\nSTEP 1: RETRIEVING AGENTS...');
    const agentsResponse = await axios.get(`${API_BASE_URL}/agent`);
    const agents = agentsResponse.data.agents;
    
    if (!agents || agents.length === 0) {
      console.log('No agents found. Exiting.');
      return;
    }
    
    const firstAgent = agents[0];
    console.log(`Using agent: "${firstAgent.name}"`);
    
    // Step 2: Get threads
    console.log('\n\nSTEP 2: RETRIEVING THREADS...');
    const threadsResponse = await axios.get(`${API_BASE_URL}/agent/threads`, {
      params: {
        agentName: firstAgent.name,
        page: 1,
        limit: 20
      }
    });
    
    const threads = threadsResponse.data.data.threads;
    console.log(`Retrieved ${threads.length} threads`);
    
    // Step 3: Check documents for each thread
    console.log('\n\nSTEP 3: CHECKING DOCUMENTS FOR EACH THREAD...');
    console.log('-'.repeat(80));
    
    const documentResults = [];
    let threadsWithDocuments = 0;
    let threadsWithoutDocuments = 0;
    let totalDocuments = 0;
    
    // Check documents for each thread
    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      process.stdout.write(`\rChecking thread ${i + 1}/${threads.length}...`);
      
      try {
        const docsResponse = await axios.get(
          `${API_BASE_URL}/agent/thread/${thread.thread_id}/documents`,
          { params: { agentName: firstAgent.name } }
        );
        
        const docCount = docsResponse.data.documents ? docsResponse.data.documents.length : 0;
        
        documentResults.push({
          thread_id: thread.thread_id,
          created_at: thread.created_at,
          status: thread.status,
          document_count: docCount,
          has_messages: thread.values && thread.values.messages ? thread.values.messages.length : 0
        });
        
        if (docCount > 0) {
          threadsWithDocuments++;
          totalDocuments += docCount;
        } else {
          threadsWithoutDocuments++;
        }
        
      } catch (error) {
        console.error(`\nError checking thread ${thread.thread_id}:`, error.message);
        documentResults.push({
          thread_id: thread.thread_id,
          created_at: thread.created_at,
          status: thread.status,
          document_count: 'ERROR',
          error: error.message
        });
      }
    }
    
    console.log('\n\n' + '='.repeat(80));
    console.log('RESULTS SUMMARY');
    console.log('='.repeat(80));
    
    // Print detailed results
    console.log('\nDETAILED THREAD DOCUMENT ANALYSIS:');
    console.log('-'.repeat(80));
    console.log('Thread ID                              | Created At           | Status | Messages | Documents');
    console.log('-'.repeat(80));
    
    documentResults.forEach(result => {
      const threadId = result.thread_id.substring(0, 36);
      const createdAt = new Date(result.created_at).toISOString().substring(0, 19);
      const status = (result.status || 'unknown').padEnd(7);
      const messages = String(result.has_messages || 0).padStart(8);
      const docs = result.document_count === 'ERROR' ? 'ERROR' : String(result.document_count).padStart(9);
      
      console.log(`${threadId} | ${createdAt} | ${status} | ${messages} | ${docs}`);
    });
    
    // Print summary statistics
    console.log('\n' + '='.repeat(80));
    console.log('STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total threads analyzed: ${threads.length}`);
    console.log(`Threads WITH documents: ${threadsWithDocuments} (${(threadsWithDocuments/threads.length*100).toFixed(1)}%)`);
    console.log(`Threads WITHOUT documents: ${threadsWithoutDocuments} (${(threadsWithoutDocuments/threads.length*100).toFixed(1)}%)`);
    console.log(`Total documents found: ${totalDocuments}`);
    
    if (threadsWithDocuments > 0) {
      console.log(`Average documents per thread (with docs): ${(totalDocuments/threadsWithDocuments).toFixed(2)}`);
    }
    
    // Identify potential issue
    console.log('\n' + '='.repeat(80));
    console.log('ISSUE ANALYSIS');
    console.log('='.repeat(80));
    
    if (threadsWithoutDocuments === threads.length) {
      console.log('🚨 CRITICAL ISSUE: No threads have any documents!');
      console.log('This indicates a potential problem with:');
      console.log('- Document retrieval process in the agent');
      console.log('- Document storage in the database');
      console.log('- The API endpoint for retrieving documents');
    } else if (threadsWithoutDocuments > threads.length * 0.8) {
      console.log('⚠️  WARNING: More than 80% of threads have no documents');
      console.log('This may indicate:');
      console.log('- Recent changes in document handling');
      console.log('- Selective document storage based on thread type');
      console.log('- Potential data migration issues');
    } else if (threadsWithoutDocuments > threads.length * 0.5) {
      console.log('ℹ️  NOTICE: More than 50% of threads have no documents');
      console.log('This might be expected if:');
      console.log('- Not all conversations require document retrieval');
      console.log('- Documents are only stored for specific query types');
    } else {
      console.log('✅ Document distribution appears normal');
    }
    
    // Check for patterns
    const recentThreads = documentResults.slice(0, 10);
    const recentWithoutDocs = recentThreads.filter(r => r.document_count === 0).length;
    
    if (recentWithoutDocs === 10) {
      console.log('\n🚨 PATTERN DETECTED: All 10 most recent threads have no documents');
      console.log('This suggests a recent issue with document storage');
    }
    
    console.log(`\n\nEnd Time: ${new Date().toISOString()}`);
    
  } catch (error) {
    console.error('\n\nERROR OCCURRED:');
    console.error('-'.repeat(80));
    console.error(error.message);
  }
}

// Run the analysis
console.log('Starting comprehensive document analysis...\n');
checkAllThreadDocuments();