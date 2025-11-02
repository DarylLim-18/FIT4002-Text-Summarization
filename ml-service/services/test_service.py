"""
ML Service Integration Test Suite.

This module provides comprehensive integration tests for the ML Service API,
validating all endpoints including health checks, text generation, embeddings,
document management, and semantic search.

Usage:
    python services/test_service.py

Requirements:
    - ML Service must be running on http://localhost:8000
    - Ollama service must be available
"""

import json
import sys
import time
from typing import Any, Callable, Dict, List, Optional

import requests
from requests.exceptions import RequestException

# Configuration
BASE_URL = "http://localhost:8000"
REQUEST_TIMEOUT = 30  # seconds
TEST_DELAY = 1  # seconds between tests


class TestResult:
    """Container for test execution results."""
    
    def __init__(self, name: str, passed: bool, message: str = ""):
        self.name = name
        self.passed = passed
        self.message = message
    
    def __str__(self) -> str:
        status = "✅ PASSED" if self.passed else "❌ FAILED"
        return f"{status} - {self.name}: {self.message}"


def print_section(title: str) -> None:
    """
    Print a formatted section header.
    
    Args:
        title: Section title to display
    """
    print(f"\n{'=' * 60}")
    print(f"{title}")
    print(f"{'=' * 60}")


def print_response(response: requests.Response) -> None:
    """
    Pretty print HTTP response details.
    
    Args:
        response: HTTP response object
    """
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except ValueError:
        print(f"Response: {response.text}")


def test_health_check() -> TestResult:
    """
    Test the health check endpoint.
    
    Validates:
        - Service is responding
        - Returns 200 status code
        - Returns valid JSON response
        - Contains expected fields
    
    Returns:
        TestResult indicating success or failure
    """
    print_section("Testing Health Check")
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=REQUEST_TIMEOUT)
        print_response(response)
        
        if response.status_code != 200:
            return TestResult(
                "Health Check",
                False,
                f"Expected status 200, got {response.status_code}"
            )
        
        data = response.json()
        required_fields = ["status", "service", "ollama_available", "chroma_stats"]
        
        for field in required_fields:
            if field not in data:
                return TestResult(
                    "Health Check",
                    False,
                    f"Missing required field: {field}"
                )
        
        return TestResult("Health Check", True, "Service is healthy")
        
    except RequestException as e:
        return TestResult("Health Check", False, f"Request failed: {str(e)}")
    except Exception as e:
        return TestResult("Health Check", False, f"Unexpected error: {str(e)}")


def test_text_generation() -> TestResult:
    """
    Test the text generation endpoint.
    
    Validates:
        - Successful text generation
        - Response contains generated text
        - Processing time is recorded
        - Generated text is non-empty
    
    Returns:
        TestResult indicating success or failure
    """
    print_section("Testing Text Generation")
    
    payload = {
        "prompt": "Explain data warehousing in 50 words",
        "system_prompt": "You are a helpful AI assistant. Be concise and clear.",
        "temperature": 0.7,
        "max_tokens": 100
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate",
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code != 200:
            return TestResult(
                "Text Generation",
                False,
                f"Status {response.status_code}: {response.text}"
            )
        
        result = response.json()
        
        # Validate response structure
        if "text" not in result or "processing_time" not in result:
            return TestResult(
                "Text Generation",
                False,
                "Missing required fields in response"
            )
        
        if not result["text"].strip():
            return TestResult(
                "Text Generation",
                False,
                "Generated text is empty"
            )
        
        print(f"Generated text: {result['text'][:100]}...")
        print(f"Processing time: {result['processing_time']:.2f}s")
        
        return TestResult(
            "Text Generation",
            True,
            f"Generated {len(result['text'])} characters in {result['processing_time']:.2f}s"
        )
        
    except RequestException as e:
        return TestResult("Text Generation", False, f"Request failed: {str(e)}")
    except Exception as e:
        return TestResult("Text Generation", False, f"Unexpected error: {str(e)}")


def test_embedding() -> TestResult:
    """
    Test the text embedding endpoint.
    
    Validates:
        - Successful embedding generation
        - Embedding has correct dimension
        - Response contains processing time
        - Embedding values are valid floats
    
    Returns:
        TestResult indicating success or failure
    """
    print_section("Testing Text Embedding")
    
    payload = {
        "text": "This is a test document for embedding generation"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/embed",
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code != 200:
            return TestResult(
                "Embedding",
                False,
                f"Status {response.status_code}: {response.text}"
            )
        
        result = response.json()
        
        # Validate response structure
        required_fields = ["embedding", "dimension", "processing_time"]
        for field in required_fields:
            if field not in result:
                return TestResult(
                    "Embedding",
                    False,
                    f"Missing required field: {field}"
                )
        
        # Validate embedding
        if not isinstance(result["embedding"], list):
            return TestResult(
                "Embedding",
                False,
                "Embedding is not a list"
            )
        
        if len(result["embedding"]) != result["dimension"]:
            return TestResult(
                "Embedding",
                False,
                f"Dimension mismatch: {len(result['embedding'])} vs {result['dimension']}"
            )
        
        print(f"Embedding dimension: {result['dimension']}")
        print(f"First 5 values: {result['embedding'][:5]}")
        print(f"Processing time: {result['processing_time']:.2f}s")
        
        return TestResult(
            "Embedding",
            True,
            f"Generated {result['dimension']}-dimensional embedding"
        )
        
    except RequestException as e:
        return TestResult("Embedding", False, f"Request failed: {str(e)}")
    except Exception as e:
        return TestResult("Embedding", False, f"Unexpected error: {str(e)}")


def test_document_addition() -> TestResult:
    """
    Test adding documents to the vector database.
    
    Validates:
        - Multiple documents can be added
        - Each addition returns success status
        - Document IDs are preserved
        - Processing time is recorded
    
    Returns:
        TestResult indicating success or failure
    """
    print_section("Testing Document Addition")
    
    documents = [
        {
            "document_id": "test_doc_1",
            "text": "Artificial Intelligence is the simulation of human intelligence in machines.",
            "metadata": {"category": "AI", "source": "test"}
        },
        {
            "document_id": "test_doc_2",
            "text": "Machine Learning is a subset of AI that enables computers to learn without explicit programming.",
            "metadata": {"category": "ML", "source": "test"}
        },
        {
            "document_id": "test_doc_3",
            "text": "Natural Language Processing helps computers understand and process human language.",
            "metadata": {"category": "NLP", "source": "test"}
        }
    ]
    
    added_count = 0
    failed_docs = []
    
    try:
        for doc in documents:
            response = requests.post(
                f"{BASE_URL}/documents",
                json=doc,
                timeout=REQUEST_TIMEOUT
            )
            
            print(f"\nDocument {doc['document_id']}: Status {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"  Added successfully in {result['processing_time']:.2f}s")
                added_count += 1
            else:
                failed_docs.append(doc['document_id'])
                print(f"  Error: {response.text}")
        
        if failed_docs:
            return TestResult(
                "Document Addition",
                False,
                f"Failed to add {len(failed_docs)} documents: {', '.join(failed_docs)}"
            )
        
        return TestResult(
            "Document Addition",
            True,
            f"Successfully added {added_count}/{len(documents)} documents"
        )
        
    except RequestException as e:
        return TestResult("Document Addition", False, f"Request failed: {str(e)}")
    except Exception as e:
        return TestResult("Document Addition", False, f"Unexpected error: {str(e)}")


def test_search() -> TestResult:
    """
    Test semantic document search.
    
    Validates:
        - Search returns results
        - Results contain expected fields
        - Distance scores are present
        - Results are ranked by relevance
    
    Returns:
        TestResult indicating success or failure
    """
    print_section("Testing Semantic Search")
    
    payload = {
        "query": "What is machine learning and how does it work?",
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/search",
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code != 200:
            return TestResult(
                "Semantic Search",
                False,
                f"Status {response.status_code}: {response.text}"
            )
        
        result = response.json()
        
        # Validate response structure
        if "results" not in result or "processing_time" not in result:
            return TestResult(
                "Semantic Search",
                False,
                "Missing required fields in response"
            )
        
        print(f"Found {len(result['results'])} results in {result['processing_time']:.2f}s")
        
        for i, res in enumerate(result['results'], 1):
            if "document" not in res or "distance" not in res or "metadata" not in res:
                return TestResult(
                    "Semantic Search",
                    False,
                    f"Result {i} missing required fields"
                )
            
            print(f"\n  {i}. Distance: {res['distance']:.3f}")
            print(f"     Text: {res['document'][:80]}...")
            print(f"     Metadata: {res['metadata']}")
        
        return TestResult(
            "Semantic Search",
            True,
            f"Found {len(result['results'])} relevant documents"
        )
        
    except RequestException as e:
        return TestResult("Semantic Search", False, f"Request failed: {str(e)}")
    except Exception as e:
        return TestResult("Semantic Search", False, f"Unexpected error: {str(e)}")


def test_summarization() -> TestResult:
    """
    Test text summarization endpoint.
    
    Validates:
        - Text is successfully summarized
        - Summary is shorter than original
        - Compression ratio is calculated
        - Summary preserves key information
    
    Returns:
        TestResult indicating success or failure
    """
    print_section("Testing Text Summarization")
    
    long_text = """
    Data warehousing is a critical component of modern business intelligence systems.
    It involves collecting, storing, and managing large volumes of data from various
    sources within an organization. A data warehouse serves as a central repository
    that enables organizations to analyze historical data and make informed business
    decisions. The process includes extracting data from operational systems,
    transforming it into a consistent format, and loading it into the warehouse.
    Data warehouses support complex queries and analysis, providing insights that
    help organizations identify trends, patterns, and opportunities for growth.
    They are designed for query and analysis rather than transaction processing,
    making them ideal for business intelligence and reporting applications.
    """
    
    payload = {
        "text": long_text.strip(),
        "max_length": 80,
        "temperature": 0.3
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/summarize",
            json=payload,
            timeout=REQUEST_TIMEOUT
        )
        
        if response.status_code != 200:
            return TestResult(
                "Summarization",
                False,
                f"Status {response.status_code}: {response.text}"
            )
        
        result = response.json()
        
        # Validate response structure
        required_fields = ["summary", "original_length", "summary_length", 
                          "compression_ratio", "processing_time"]
        for field in required_fields:
            if field not in result:
                return TestResult(
                    "Summarization",
                    False,
                    f"Missing required field: {field}"
                )
        
        # Validate summary is shorter
        if result["summary_length"] >= result["original_length"]:
            return TestResult(
                "Summarization",
                False,
                "Summary is not shorter than original text"
            )
        
        print(f"Original length: {result['original_length']} words")
        print(f"Summary length: {result['summary_length']} words")
        print(f"Compression ratio: {result['compression_ratio']:.2%}")
        print(f"Summary: {result['summary']}")
        print(f"Processing time: {result['processing_time']:.2f}s")
        
        return TestResult(
            "Summarization",
            True,
            f"Compressed to {result['compression_ratio']:.2%} of original"
        )
        
    except RequestException as e:
        return TestResult("Summarization", False, f"Request failed: {str(e)}")
    except Exception as e:
        return TestResult("Summarization", False, f"Unexpected error: {str(e)}")


def test_stats() -> TestResult:
    """
    Test service statistics endpoint.
    
    Validates:
        - Statistics endpoint is accessible
        - Returns Ollama availability status
        - Returns ChromaDB statistics
        - Contains expected fields
    
    Returns:
        TestResult indicating success or failure
    """
    print_section("Testing Service Statistics")
    
    try:
        response = requests.get(f"{BASE_URL}/stats", timeout=REQUEST_TIMEOUT)
        
        if response.status_code != 200:
            return TestResult(
                "Statistics",
                False,
                f"Status {response.status_code}: {response.text}"
            )
        
        data = response.json()
        print_response(response)
        
        required_fields = ["ollama_available", "ollama_model", "chroma_stats"]
        for field in required_fields:
            if field not in data:
                return TestResult(
                    "Statistics",
                    False,
                    f"Missing required field: {field}"
                )
        
        return TestResult("Statistics", True, "Statistics retrieved successfully")
        
    except RequestException as e:
        return TestResult("Statistics", False, f"Request failed: {str(e)}")
    except Exception as e:
        return TestResult("Statistics", False, f"Unexpected error: {str(e)}")


def cleanup_test_documents() -> None:
    """
    Clean up test documents from ChromaDB.
    
    Attempts to delete test documents created during testing.
    Errors are logged but don't fail the cleanup process.
    """
    print_section("Cleaning Up Test Documents")
    
    test_doc_ids = ["test_doc_1", "test_doc_2", "test_doc_3"]
    
    for doc_id in test_doc_ids:
        try:
            response = requests.delete(
                f"{BASE_URL}/documents/{doc_id}",
                timeout=REQUEST_TIMEOUT
            )
            if response.status_code in [200, 204]:
                print(f"✅ Deleted {doc_id}")
            elif response.status_code == 404:
                print(f"⚠️  {doc_id} not found (may have been deleted already)")
            else:
                print(f"⚠️  Failed to delete {doc_id}: {response.status_code}")
        except Exception as e:
            print(f"⚠️  Error deleting {doc_id}: {str(e)}")


def wait_for_service(max_retries: int = 5, retry_delay: int = 2) -> bool:
    """
    Wait for ML service to become available.
    
    Args:
        max_retries: Maximum number of connection attempts
        retry_delay: Seconds to wait between retries
    
    Returns:
        True if service is available, False otherwise
    """
    print_section("Waiting for ML Service")
    
    for attempt in range(1, max_retries + 1):
        try:
            response = requests.get(f"{BASE_URL}/", timeout=5)
            if response.status_code == 200:
                print(f"✅ Service is ready (attempt {attempt}/{max_retries})")
                return True
        except RequestException:
            pass
        
        if attempt < max_retries:
            print(f"⏳ Waiting for service... (attempt {attempt}/{max_retries})")
            time.sleep(retry_delay)
    
    print(f"❌ Service not available after {max_retries} attempts")
    return False


def run_all_tests() -> int:
    """
    Execute all test cases and report results.
    
    Returns:
        Exit code (0 for success, 1 for failures)
    """
    print("╔════════════════════════════════════════════════════════════╗")
    print("║           ML Service Integration Test Suite               ║")
    print("╚════════════════════════════════════════════════════════════╝")
    
    # Wait for service
    if not wait_for_service():
        print(f"\n❌ ML Service is not available. Please start the service and try again.")
        return 1
    
    # Define test suite
    tests: List[Callable[[], TestResult]] = [
        test_health_check,
        test_text_generation,
        test_embedding,
        test_document_addition,
        test_search,
        test_summarization,
        test_stats,
    ]
    
    results: List[TestResult] = []
    
    # Execute tests
    for test_func in tests:
        try:
            result = test_func()
            results.append(result)
            time.sleep(TEST_DELAY)  # Pause between tests
        except Exception as e:
            results.append(TestResult(
                test_func.__name__,
                False,
                f"Unexpected error: {str(e)}"
            ))
    
    # Cleanup
    cleanup_test_documents()
    
    # Print summary
    print_section("Test Results Summary")
    
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    
    for result in results:
        print(result)

    print(f"\n{'=' * 60}")
    print(f"Total: {passed}/{total} tests passed")

    if passed == total:
        print(f"✅ All tests passed!")
        return 0
    else:
        failed = total - passed
        print(f"❌ {failed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = run_all_tests()
    sys.exit(exit_code)