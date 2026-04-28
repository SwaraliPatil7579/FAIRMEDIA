"""
Language detection service.
Detects the language of input text.
"""

import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class LanguageDetectionService:
    """Simple language detection based on character patterns and common words."""
    
    # Common words for language detection
    LANGUAGE_PATTERNS = {
        'en': ['the', 'is', 'and', 'to', 'of', 'a', 'in', 'that', 'it', 'for'],
        'es': ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se'],
        'fr': ['le', 'de', 'un', 'être', 'et', 'à', 'il', 'avoir', 'ne', 'je'],
        'de': ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich'],
        'pt': ['o', 'a', 'de', 'que', 'e', 'do', 'da', 'em', 'um', 'para'],
        'it': ['il', 'di', 'e', 'la', 'che', 'per', 'un', 'in', 'è', 'a'],
    }
    
    def detect_language(self, text: str) -> str:
        """
        Detect language from text content.
        
        Args:
            text: Input text
            
        Returns:
            ISO 639-1 language code (defaults to 'en')
        """
        if not text or len(text.strip()) < 10:
            logger.warning("Text too short for reliable language detection")
            return 'en'
        
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)
        
        if not words:
            return 'en'
        
        # Count matches for each language
        scores = {}
        for lang, patterns in self.LANGUAGE_PATTERNS.items():
            score = sum(1 for word in words if word in patterns)
            scores[lang] = score
        
        # Return language with highest score
        detected_lang = max(scores, key=scores.get)
        confidence = scores[detected_lang] / len(words) if words else 0
        
        # Default to English if confidence is too low
        if confidence < 0.01:
            logger.info(f"Low confidence ({confidence:.2f}), defaulting to English")
            return 'en'
        
        logger.info(f"Detected language: {detected_lang} (confidence: {confidence:.2f})")
        return detected_lang
    
    def get_language_name(self, code: str) -> str:
        """Get full language name from code."""
        names = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'pt': 'Portuguese',
            'it': 'Italian',
        }
        return names.get(code, 'Unknown')
