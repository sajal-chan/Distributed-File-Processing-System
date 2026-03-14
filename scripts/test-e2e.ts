import fs from 'fs';
import path from 'path';
import { UploadResponse, JobStatusResponse, JobResultResponse } from '../types';

const BASE_URL = 'http://localhost:5000/api';
const TEST_FILE_PATH = './test-sample.txt';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadTestFile(): Promise<number> {
  // Create a test file
  const testContent = 'The quick brown fox jumps over the lazy dog. The dog barked loudly. Fox and dog are animals.';
  fs.writeFileSync(TEST_FILE_PATH, testContent);

  // Create form data
  const formData = new FormData();
  formData.append('name', 'Test User');
  formData.append('email', 'test@example.com');
  formData.append('file', new File([testContent], 'test-sample.txt', { type: 'text/plain' }));

  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const data = (await response.json()) as UploadResponse;
  console.log('✅ File uploaded successfully');
  console.log(`   Job ID: ${data.jobId}`);
  return data.jobId;
}

async function pollJobStatus(jobId: number): Promise<void> {
  let completed = false;
  let attempts = 0;
  const maxAttempts = 30;

  while (!completed && attempts < maxAttempts) {
    const response = await fetch(`${BASE_URL}/jobs/${jobId}/status`);

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }

    const data = (await response.json()) as JobStatusResponse;
    console.log(`   Status: ${data.status}, Progress: ${data.progress}%`);

    if (data.status === 'COMPLETED') {
      completed = true;
      console.log('✅ Job completed');
    } else if (data.status === 'FAILED') {
      throw new Error('Job processing failed');
    } else {
      attempts++;
      if (attempts < maxAttempts) {
        await sleep(1000);
      }
    }
  }

  if (!completed) {
    throw new Error('Job did not complete within 30 seconds');
  }
}

async function getJobResult(jobId: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/jobs/${jobId}/result`);

  if (!response.ok) {
    throw new Error(`Failed to get job result: ${response.statusText}`);
  }

  const data = (await response.json()) as JobResultResponse;
  console.log('✅ Job result retrieved');
  console.log(`   Word Count: ${data.wordCount}`);
  console.log(`   Paragraph Count: ${data.paragraphCount}`);
  console.log(`   Top Keywords: ${data.topKeywords.join(', ')}`);
}

async function registerInterest(): Promise<void> {
  const response = await fetch(`${BASE_URL}/interest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test User',
      email: 'test@example.com',
      selectedStep: 'Step 1',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to register interest: ${response.statusText}`);
  }

  const data = await response.json() as { message: string };
  console.log('✅ Interest registered');
  console.log(`   Response: ${data.message}`);
}

async function runTests(): Promise<void> {
  console.log('🚀 Starting E2E tests...\n');

  try {
    console.log('📤 Uploading test file...');
    const jobId = await uploadTestFile();

    console.log('\n⏳ Polling job status...');
    await pollJobStatus(jobId);

    console.log('\n📊 Retrieving job result...');
    await getJobResult(jobId);

    console.log('\n📝 Registering interest...');
    await registerInterest();

    console.log('\n✅ All tests passed!\n');
  } catch (err) {
    console.error('❌ Test failed:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  } finally {
    // Cleanup
    if (fs.existsSync(TEST_FILE_PATH)) {
      fs.unlinkSync(TEST_FILE_PATH);
      console.log('🧹 Cleaned up test file');
    }
  }
}

runTests();
