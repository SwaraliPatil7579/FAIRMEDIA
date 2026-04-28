"""
Google Cloud Natural Language API client.
"""

from google.cloud import language_v1
from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


class NaturalLanguageClient:
    """Client for Google Cloud Natural Language API."""
    
    def __init__(self):
        """Initialize Natural Language API client."""
        self.client = language_v1.LanguageServiceClient()
        logger.info("☁️  Google Natural Language API client initialized")
    
    async def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Comprehensive text analysis using Google NLP.
        
        Args:
            text: Input text to analyze
            
        Returns:
            Analysis results with sentiment, entities, and syntax
        """
        try:
            document = language_v1.Document(
                content=text,
                type_=language_v1.Document.Type.PLAIN_TEXT
            )
            
            # Sentiment analysis
            sentiment_response = self.client.analyze_sentiment(
                request={'document': document}
            )
            
            # Entity analysis
            entities_response = self.client.analyze_entities(
                request={'document': document}
            )
            
            # Syntax analysis
            syntax_response = self.client.analyze_syntax(
                request={'document': document}
            )
            
            result = {
                "sentiment": {
                    "score": sentiment_response.document_sentiment.score,
                    "magnitude": sentiment_response.document_sentiment.magnitude
                },
                "entities": self._extract_entities(entities_response.entities),
                "syntax": self._extract_syntax(syntax_response.tokens),
                "language": sentiment_response.language
            }
            
            logger.info(f"✅ Google NLP analysis completed: {len(result['entities'])} entities found")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Google NLP analysis failed: {e}")
            raise
    
    def _extract_entities(self, entities: List) -> List[Dict[str, Any]]:
        """Extract entity information."""
        return [
            {
                "name": entity.name,
                "type": language_v1.Entity.Type(entity.type_).name,
                "salience": entity.salience,
                "mentions": [
                    {
                        "text": mention.text.content,
                        "type": language_v1.EntityMention.Type(mention.type_).name
                    }
                    for mention in entity.mentions
                ]
            }
            for entity in entities
        ]
    
    def _extract_syntax(self, tokens: List) -> Dict[str, Any]:
        """Extract syntax information including pronouns."""
        pronouns = {
            "male": [],
            "female": [],
            "neutral": []
        }
        
        male_pronouns = {"he", "him", "his", "himself"}
        female_pronouns = {"she", "her", "hers", "herself"}
        neutral_pronouns = {"they", "them", "their", "theirs", "themselves"}
        
        for token in tokens:
            text_lower = token.text.content.lower()
            
            if token.part_of_speech.tag == language_v1.PartOfSpeech.Tag.PRON:
                if text_lower in male_pronouns:
                    pronouns["male"].append(token.text.content)
                elif text_lower in female_pronouns:
                    pronouns["female"].append(token.text.content)
                elif text_lower in neutral_pronouns:
                    pronouns["neutral"].append(token.text.content)
        
        return {
            "pronouns": pronouns,
            "male_count": len(pronouns["male"]),
            "female_count": len(pronouns["female"]),
            "neutral_count": len(pronouns["neutral"]),
            "total_tokens": len(tokens)
        }
    
    async def detect_language(self, text: str) -> Dict[str, Any]:
        """
        Detect language of text.
        
        Args:
            text: Input text
            
        Returns:
            Language detection result
        """
        try:
            document = language_v1.Document(
                content=text,
                type_=language_v1.Document.Type.PLAIN_TEXT
            )
            
            response = self.client.analyze_sentiment(
                request={'document': document}
            )
            
            return {
                "language": response.language,
                "confidence": 1.0  # Google NLP doesn't provide confidence
            }
            
        except Exception as e:
            logger.error(f"❌ Language detection failed: {e}")
            return {"language": "unknown", "confidence": 0.0}
