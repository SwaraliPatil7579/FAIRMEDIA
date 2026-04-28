"""
Mock Google Cloud Natural Language API for free tier / development.
Simulates Google NLP responses without requiring actual API calls.
"""

import re
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class MockGoogleNLPService:
    """
    Mock implementation of Google Cloud Natural Language API.
    Provides realistic responses without actual API calls.
    Switch to real GoogleNLPService when credentials are available.
    """
    
    def __init__(self):
        logger.info("🔧 Mock Google NLP Service initialized (FREE mode)")
    
    async def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Simulate Google NLP analysis.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Simulated NLP analysis results
        """
        # Simulate sentiment analysis
        sentiment = self._analyze_sentiment(text)
        
        # Simulate entity extraction
        entities = self._extract_entities(text)
        
        # Simulate syntax analysis
        syntax = self._analyze_syntax(text)
        
        # Detect language
        language = self._detect_language(text)
        
        result = {
            "sentiment": sentiment,
            "entities": entities,
            "syntax": syntax,
            "language": language,
            "source": "mock_google_nlp"
        }
        
        logger.info(f"✅ Mock Google NLP analysis completed: {len(entities)} entities found")
        
        return result
    
    def _analyze_sentiment(self, text: str) -> Dict[str, float]:
        """Simulate sentiment analysis."""
        # Simple heuristic-based sentiment
        positive_words = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic']
        negative_words = ['bad', 'terrible', 'awful', 'horrible', 'poor', 'worst']
        
        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        # Calculate score (-1 to 1)
        total = positive_count + negative_count
        if total == 0:
            score = 0.0
        else:
            score = (positive_count - negative_count) / total
        
        # Magnitude (0 to infinity, typically 0-10)
        magnitude = (positive_count + negative_count) * 0.5
        
        return {
            "score": round(score, 2),
            "magnitude": round(magnitude, 2)
        }
    
    def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Simulate entity extraction."""
        entities = []
        
        # Common entity patterns
        patterns = {
            "PERSON": [
                r'\b(CEO|chairman|director|manager|engineer|doctor|scientist|lawyer)\b',
                r'\b(he|him|his|she|her|hers)\b'
            ],
            "ORGANIZATION": [
                r'\b(company|corporation|organization|firm|business)\b'
            ],
            "LOCATION": [
                r'\b(office|workplace|headquarters|building)\b'
            ],
            "OTHER": [
                r'\b(team|group|department|division)\b'
            ]
        }
        
        for entity_type, pattern_list in patterns.items():
            for pattern in pattern_list:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    entities.append({
                        "name": match.group(),
                        "type": entity_type,
                        "salience": 0.5,  # Simulated importance score
                        "mentions": [{
                            "text": match.group(),
                            "type": "COMMON"
                        }]
                    })
        
        return entities[:10]  # Limit to 10 entities
    
    def _analyze_syntax(self, text: str) -> Dict[str, Any]:
        """Simulate syntax analysis including pronoun detection."""
        pronouns = {
            "male": [],
            "female": [],
            "neutral": []
        }
        
        male_pronouns = {"he", "him", "his", "himself"}
        female_pronouns = {"she", "her", "hers", "herself"}
        neutral_pronouns = {"they", "them", "their", "theirs", "themselves"}
        
        words = re.findall(r'\b\w+\b', text.lower())
        
        for word in words:
            if word in male_pronouns:
                pronouns["male"].append(word)
            elif word in female_pronouns:
                pronouns["female"].append(word)
            elif word in neutral_pronouns:
                pronouns["neutral"].append(word)
        
        return {
            "pronouns": pronouns,
            "male_count": len(pronouns["male"]),
            "female_count": len(pronouns["female"]),
            "neutral_count": len(pronouns["neutral"]),
            "total_tokens": len(words)
        }
    
    def _detect_language(self, text: str) -> str:
        """Simulate language detection."""
        # Check for Devanagari (Hindi) characters
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        
        if hindi_chars > 10:
            return "hi"
        return "en"
    
    async def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Simulate language detection.
        
        Args:
            text: Input text
            
        Returns:
            Language detection result
        """
        language = self._detect_language(text)
        
        return {
            "language": language,
            "confidence": 0.95  # Simulated confidence
        }


# Factory function to get appropriate service
def get_nlp_service(use_real_api: bool = False):
    """
    Get NLP service (mock or real).
    
    Args:
        use_real_api: If True and credentials available, use real Google NLP
        
    Returns:
        NLP service instance
    """
    if use_real_api:
        try:
            from backend.google.natural_language_client import NaturalLanguageClient
            logger.info("✅ Using real Google Cloud Natural Language API")
            return NaturalLanguageClient()
        except Exception as e:
            logger.warning(f"⚠️  Real Google NLP not available: {e}. Using mock.")
            return MockGoogleNLPService()
    else:
        return MockGoogleNLPService()
