from typing import List, Dict, Any, Optional
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class AISearchRequest(BaseModel):
    query: str
    n_results: int = 5
    use_ai_enhancement: bool = True
    search_type: str = "semantic"  # "semantic", "keyword", "hybrid"
    include_explanations: bool = False
    rerank_with_ai: bool = False

class AISearchResult(BaseModel):
    id: str
    content: str
    metadata: Dict[str, Any]
    similarity_score: float
    ai_relevance_score: Optional[float] = None
    combined_score: Optional[float] = None
    relevance_explanation: Optional[str] = None
    enhanced_query: Optional[str] = None

class AISearchResponse(BaseModel):
    results: List[AISearchResult]
    processing_time: float
    original_query: str
    enhanced_query: Optional[str] = None
    search_metadata: Dict[str, Any]

class AISearchService:
    def __init__(self, model, embedding_model, document_processor):
        self.model = model
        self.embedding_model = embedding_model
        self.document_processor = document_processor
    
    async def enhance_query(self, original_query: str) -> str:
        """Use AI to enhance and expand the search query for better results"""
        enhancement_prompt = f"""
You are a search optimization expert. Expand this search query to include related terms, synonyms, and concepts that would help find relevant content.

Original query: "{original_query}"

Create an enhanced query that includes:
- The original terms
- Related concepts and synonyms
- Alternative phrasings
- Context-relevant terms

Keep the enhanced query focused and under 50 words.

Enhanced query:
"""
        
        try:
            enhanced = self.model.generate(
                prompt=enhancement_prompt,
                max_length=100,
                temperature=0.3,
                system_prompt="You are an expert at improving search queries to find the most relevant content."
            )
            
            enhanced_query = enhanced.strip()
            logger.info(f"Query enhanced: '{original_query}' → '{enhanced_query}'")
            return enhanced_query
            
        except Exception as e:
            logger.error(f"Query enhancement failed: {e}")
            return original_query
    
    async def generate_relevance_explanation(self, query: str, content: str, metadata: Dict) -> str:
        """Generate an explanation of why this content is relevant to the query"""
        
        # Extract useful metadata info
        doc_type = metadata.get('file_type', 'document')
        file_name = metadata.get('file_name', 'unknown')
        
        explanation_prompt = f"""
Explain in 1-2 clear sentences why this content is relevant to the user's search.

Search query: "{query}"
Content: "{content[:400]}..."
Document type: {doc_type}
Source: {file_name}

Focus on the key connections and relevance. Be specific and helpful:
"""
        
        try:
            explanation = self.model.generate(
                prompt=explanation_prompt,
                max_length=80,
                temperature=0.4,
                system_prompt="You help users understand why search results match their queries."
            )
            return explanation.strip()
        except Exception as e:
            logger.error(f"Explanation generation failed: {e}")
            return f"This content contains information relevant to '{query}'."
    
    async def ai_rerank_result(self, query: str, content: str, metadata: Dict) -> float:
        """Use AI to score the relevance of a single result"""
        
        relevance_prompt = f"""
Rate how relevant this content is to the search query on a scale of 1-10.

Query: "{query}"
Content: "{content[:500]}..."

Consider:
- Direct relevance to the query
- Quality and usefulness of information
- Context and meaning match
- Overall helpfulness to the user

Provide only a number from 1-10 (10 = perfect match):
"""
        
        try:
            relevance_response = self.model.generate(
                prompt=relevance_prompt,
                max_length=5,
                temperature=0.1,
                system_prompt="You are an expert at evaluating content relevance for search queries."
            )
            
            # Extract numeric score
            score_text = relevance_response.strip().split()[0]
            ai_score = float(score_text)
            ai_score = max(1.0, min(10.0, ai_score))  # Clamp between 1-10
            
            return ai_score / 10.0  # Convert to 0-1 scale
            
        except Exception as e:
            logger.error(f"AI reranking failed: {e}")
            return 0.5  # Default neutral score
    
    async def hybrid_search(self, request: AISearchRequest) -> AISearchResponse:
        """Perform AI-enhanced hybrid search"""
        import time
        start_time = time.time()
        
        # Step 1: Enhance query if requested
        search_query = request.query
        if request.use_ai_enhancement:
            search_query = await self.enhance_query(request.query)
        
        # Step 2: Generate embedding and search
        query_embedding = self.embedding_model.encode([search_query])[0].tolist()
        
        # Get more results initially if we're going to rerank
        initial_count = request.n_results * 2 if request.rerank_with_ai else request.n_results
        
        search_results = self.document_processor.search_similar_documents(
            query_embedding, 
            initial_count
        )
        
        # Step 3: Process results
        processed_results = []
        
        for i in range(len(search_results["ids"])):
            content = search_results["documents"][i]
            metadata = search_results["metadatas"][i]
            similarity_score = 1 - search_results["distances"][i] if search_results["distances"] else 0
            
            result = AISearchResult(
                id=search_results["ids"][i],
                content=content,
                metadata=metadata,
                similarity_score=round(similarity_score, 4),
                enhanced_query=search_query if request.use_ai_enhancement else None
            )
            
            # Step 4: AI reranking if requested
            if request.rerank_with_ai:
                ai_score = await self.ai_rerank_result(request.query, content, metadata)
                combined_score = (similarity_score * 0.6) + (ai_score * 0.4)
                
                result.ai_relevance_score = round(ai_score, 4)
                result.combined_score = round(combined_score, 4)
            
            # Step 5: Generate explanations if requested
            if request.include_explanations:
                explanation = await self.generate_relevance_explanation(
                    request.query, content, metadata
                )
                result.relevance_explanation = explanation
            
            processed_results.append(result)
        
        # Step 6: Sort by appropriate score
        if request.rerank_with_ai:
            processed_results.sort(key=lambda x: x.combined_score, reverse=True)
        else:
            processed_results.sort(key=lambda x: x.similarity_score, reverse=True)
        
        # Step 7: Return top results
        final_results = processed_results[:request.n_results]
        
        processing_time = time.time() - start_time
        
        return AISearchResponse(
            results=final_results,
            processing_time=round(processing_time, 4),
            original_query=request.query,
            enhanced_query=search_query if request.use_ai_enhancement else None,
            search_metadata={
                "total_candidates": len(search_results["ids"]),
                "ai_enhancement_used": request.use_ai_enhancement,
                "ai_reranking_used": request.rerank_with_ai,
                "explanations_included": request.include_explanations
            }
        )
    
    async def smart_search(self, query: str, n_results: int = 5) -> AISearchResponse:
        """Quick smart search with sensible defaults"""
        request = AISearchRequest(
            query=query,
            n_results=n_results,
            use_ai_enhancement=True,
            include_explanations=True,
            rerank_with_ai=False  # Disable for faster response
        )
        return await self.hybrid_search(request)
    
    async def deep_search(self, query: str, n_results: int = 5) -> AISearchResponse:
        """Thorough search with all AI features enabled"""
        request = AISearchRequest(
            query=query,
            n_results=n_results,
            use_ai_enhancement=True,
            include_explanations=True,
            rerank_with_ai=True
        )
        return await self.hybrid_search(request)