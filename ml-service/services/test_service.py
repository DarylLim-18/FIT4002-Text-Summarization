import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test basic health check"""
    print("🔍 Testing health check...")
    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200

def test_text_generation():
    """Test text generation"""
    print("\n📝 Testing text generation...")
    payload = {
        "prompt": "Explain data warehousing in 50 words",
        "system_prompt": "You are a helpful AI assistant. Be concise and clear.",
        "temperature": 0.7,
        "max_tokens": 100
    }
    
    response = requests.post(f"{BASE_URL}/generate", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Generated text: {result['text']}")
        print(f"Processing time: {result['processing_time']:.2f}s")
    else:
        print(f"Error: {response.text}")
    return response.status_code == 200

def test_embedding():
    """Test text embedding"""
    print("\n🧮 Testing text embedding...")
    payload = {
        "text": "This is a test document for embedding"
    }
    
    response = requests.post(f"{BASE_URL}/embed", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Embedding dimension: {result['dimension']}")
        print(f"First 5 values: {result['embedding'][:5]}")
        print(f"Processing time: {result['processing_time']:.2f}s")
        return True
    else:
        print(f"Error: {response.text}")
    return None

def test_document_addition():
    """Test adding documents to ChromaDB"""
    print("\n📚 Testing document addition...")
    
    documents = [
        {
            "document_id": "doc_1",
            "text": "Artificial Intelligence is the simulation of human intelligence in machines.",
            "metadata": {"category": "AI", "source": "test"}
        },
        {
            "document_id": "doc_2", 
            "text": "Machine Learning is a subset of AI that enables computers to learn without explicit programming.",
            "metadata": {"category": "ML", "source": "test"}
        },
        {
            "document_id": "doc_3",
            "text": "Natural Language Processing helps computers understand and process human language.",
            "metadata": {"category": "NLP", "source": "test"}
        }
    ]
    
    for doc in documents:
        response = requests.post(f"{BASE_URL}/documents", json=doc)
        print(f"Document {doc['document_id']}: Status {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"  Added successfully in {result['processing_time']:.2f}s")
        else:
            print(f"  Error: {response.text}")
            return False
    return True

def test_search():
    """Test document search"""
    print("\n🔍 Testing document search...")
    payload = {
        "query": "What is machine learning?",
        "n_results": 3
    }
    
    response = requests.post(f"{BASE_URL}/search", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Found {len(result['results'])} results in {result['processing_time']:.2f}s")
        for i, res in enumerate(result['results']):
            print(f"  {i+1}. Distance: {res['distance']:.3f}")
            print(f"     Text: {res['document'][:100]}...")
            print(f"     Metadata: {res['metadata']}")
    else:
        print(f"Error: {response.text}")
        return False
    return True

def test_stats():
    """Test service statistics"""
    print("\n📊 Testing service stats...")
    response = requests.get(f"{BASE_URL}/stats")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print(f"Stats: {json.dumps(response.json(), indent=2)}")
        return True
    return False

def test_text_summarization():
    """Test text summarization"""
    print("\n📄 Testing text summarization...")
    
    # Long text to summarize
    long_text = """
    Document here
    """
    
    payload = {
        "text": long_text.strip(),
        "max_length": 80,
        "temperature": 0.3
    }
    
    response = requests.post(f"{BASE_URL}/summarize", json=payload)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Original length: {result['original_length']} words")
        print(f"Summary length: {result['summary_length']} words")
        print(f"Compression ratio: {result['compression_ratio']:.2f}")
        print(f"Summary: {result['summary']}")
        print(f"Processing time: {result['processing_time']:.2f}s")
        return True
    else:
        print(f"Error: {response.text}")
    return False

def run_all_tests():
    """Run all tests"""
    print("🚀 Starting ML Service Tests\n")
    print("=" * 50)
    
    # Wait for service to be ready
    print("⏳ Waiting for service to be ready...")
    time.sleep(2)
    
    tests = [
        test_health_check,
        test_text_generation,
        test_embedding,
        test_document_addition,
        test_search,
        test_stats
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            time.sleep(1)  # Brief pause between tests
        except Exception as e:
            print(f"❌ Test failed with error: {str(e)}")
    
    print("\n" + "=" * 50)
    print(f"🎯 Tests completed: {passed}/{total} passed")
    
    if passed == total:
        print("✅ All tests passed!")
    else:
        print(f"❌ {total - passed} tests failed")

if __name__ == "__main__":
    # run_all_tests()
    test_text_summarization()