"""
Mock AI service for development and testing.
Returns realistic bias detection results without requiring external AI models.
Enhanced with multilingual support (English + Hindi)
"""

import re
from typing import List, Dict
from schemas.ai_schema import AIAnalysisResult, BiasScores, HighlightedSpan
from services.ai_engine.language_service import LanguageDetectionService
from services.ai_engine.enhanced_bias_detector import EnhancedBiasDetector
import logging

logger = logging.getLogger(__name__)


class MockAIService:
    """
    Mock implementation of AI bias detection.
    Uses rule-based pattern matching to simulate AI analysis.
    """
    
    def __init__(self):
        self.language_service = LanguageDetectionService()
        self.enhanced_detector = EnhancedBiasDetector()
        
        # Bias detection patterns
        self.gender_patterns = [
            r'\b(he|his|him|himself)\b',
            r'\b(she|her|hers|herself)\b',
            r'\b(man|men|male|guy|guys)\b',
            r'\b(woman|women|female|girl|girls|lady|ladies)\b',
            r'\b(chairman|policeman|fireman|businessman)\b',
        ]
        
        self.stereotype_patterns = [
            r'\b(typical|naturally|obviously|inherently)\s+(woman|man|female|male)\b',
            r'\b(women|men)\s+(are|tend to|usually|always)\b',
            r'\b(emotional|aggressive|nurturing|dominant)\s+(woman|man|female|male)\b',
        ]
        
        logger.info("🤖 Mock AI Service initialized")
    
    async def analyze_bias(
        self,
        content: str,
        analysis_id: str,
        language: str = None
    ) -> AIAnalysisResult:
        """
        Analyze text for bias using enhanced multilingual detection.
        
        Args:
            content: Text to analyze
            analysis_id: Unique identifier
            language: Optional language hint
            
        Returns:
            AIAnalysisResult with bias scores and highlighted spans
        """
        logger.info(f"🤖 Mock AI analyzing: {analysis_id}")
        
        # Use enhanced detector for better results
        enhanced_result = self.enhanced_detector.analyze(content)
        
        # Detect language if not provided
        if not language:
            language = enhanced_result["language_info"]["detected"]
        
        # Extract bias scores from enhanced detector
        gender_bias = enhanced_result["gender_bias"]["gender_bias_score"]
        hindi_bias  = enhanced_result["hindi_bias"]["hindi_bias_score"]
        romanised_bias = enhanced_result.get("romanised_hindi_bias", {}).get("romanised_hindi_bias_score", 0.0)

        # Stereotype: explicit stereotype findings from English patterns
        stereotype_issues = len(enhanced_result["gender_bias"]["stereotypes_found"])
        stereotype = min(stereotype_issues * 0.15, 1.0)

        # Language dominance
        language_dominance = enhanced_result.get("language_dominance", 0.0)

        # Overall: use the combined score from the detector, blend with language dominance
        combined = enhanced_result.get("combined_bias_score", 0.0)
        overall = round(min(1.0, combined * 0.7 + language_dominance * 0.3), 2)

        # For Hindi-dominant or mixed text, reflect hindi/romanised bias in gender_bias dim
        lang_info = enhanced_result["language_info"]
        if lang_info.get("hindi_pct", 0) >= 50 or romanised_bias > 0:
            gender_bias = max(gender_bias, hindi_bias, romanised_bias)
        
        # Convert enhanced results to highlighted spans with suggestions
        highlighted_spans = []
        for item in enhanced_result["all_biased_terms"]:
            # Get suggestion/alternative
            suggestion = item.get("suggestion") or item.get("neutral_alternative") or item.get("neutral", "")
            
            highlighted_spans.append(HighlightedSpan(
                span=[item["start"], item["end"]],
                text=item["phrase"],
                bias_type=item.get("type", "gender_bias"),
                severity="high" if overall > 0.7 else "medium" if overall > 0.4 else "low",
                contribution_score=0.15,
                suggestion=suggestion  # Add suggestion field
            ))
        
        # Generate explanations
        lang_pct_info = f"Hindi: {enhanced_result['language_info']['hindi_pct']}%, English: {enhanced_result['language_info']['english_pct']}%"
        hindi_issues = enhanced_result["hindi_bias"]["total_issues"]
        explanations = {
            "gender_bias": self._explain_gender_bias(gender_bias, content),
            "stereotype": self._explain_stereotype(stereotype, content),
            "language_dominance": (
                f"Language: {language.upper()} ({lang_pct_info}). "
                + (f"{hindi_issues} Hindi bias term(s) detected." if hindi_issues > 0 else "")
            )
        }
        
        result = AIAnalysisResult(
            bias_scores=BiasScores(
                gender_bias=gender_bias,
                stereotype=stereotype,
                language_dominance=language_dominance,
                overall=overall
            ),
            explanations=explanations,
            highlighted_text=highlighted_spans,
            language_detected=language,
            confidence=0.85,
            model_version="mock-ai-v1.0.0",
            alternative_text=self._generate_alternative_text(content, highlighted_spans)
        )
        
        logger.info(
            f"✅ Mock AI completed: overall_bias={overall:.2f}, "
            f"spans={len(highlighted_spans)}"
        )
        
        return result
    
    def _calculate_gender_bias(self, text: str) -> float:
        """Calculate gender bias score based on gendered language."""
        text_lower = text.lower()
        matches = 0
        
        for pattern in self.gender_patterns:
            matches += len(re.findall(pattern, text_lower))
        
        # Normalize by text length
        words = len(text.split())
        if words == 0:
            return 0.0
        
        score = min(1.0, (matches / words) * 10)
        return round(score, 2)
    
    def _calculate_stereotype_bias(self, text: str) -> float:
        """Calculate stereotype bias score."""
        text_lower = text.lower()
        matches = 0
        
        for pattern in self.stereotype_patterns:
            matches += len(re.findall(pattern, text_lower))
        
        # Higher weight for stereotypes
        score = min(1.0, matches * 0.3)
        return round(score, 2)
    
    def _calculate_language_dominance(self, text: str) -> float:
        """Calculate language dominance bias."""
        # Check for English-centric or culturally specific references
        english_centric = [
            'american', 'british', 'western', 'english-speaking'
        ]
        
        text_lower = text.lower()
        matches = sum(1 for term in english_centric if term in text_lower)
        
        score = min(1.0, matches * 0.2)
        return round(score, 2)
    
    def _find_biased_spans(self, text: str) -> List[HighlightedSpan]:
        """Find specific text spans that contribute to bias."""
        spans = []
        text_lower = text.lower()
        
        # Find gender-biased terms
        for pattern in self.gender_patterns[:3]:  # Limit to avoid too many spans
            for match in re.finditer(pattern, text_lower):
                start, end = match.span()
                spans.append(HighlightedSpan(
                    span=[start, end],
                    text=text[start:end],
                    bias_type="gender_bias",
                    severity="medium" if len(spans) < 3 else "low",
                    contribution_score=0.15
                ))
        
        # Limit to top 5 spans
        return spans[:5]
    
    def _explain_gender_bias(self, score: float, text: str) -> str:
        """Generate explanation for gender bias score."""
        # Check if text is Hindi-dominant
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        is_hindi = hindi_chars > english_chars

        if score < 0.2:
            return ("न्यूनतम लिंग पूर्वाग्रह पाया गया। भाषा अधिकतर तटस्थ है।"
                    if is_hindi else
                    "Minimal gender bias detected. Language is mostly gender-neutral.")
        elif score < 0.5:
            return ("मध्यम लिंग पूर्वाग्रह पाया गया। कुछ लैंगिक रूढ़िवादी शब्द मौजूद हैं।"
                    if is_hindi else
                    "Moderate gender bias detected. Some gendered pronouns and terms present.")
        elif score < 0.7:
            return ("महत्वपूर्ण लिंग पूर्वाग्रह पाया गया। लैंगिक भाषा और भूमिका संबंधी धारणाएं अधिक हैं।"
                    if is_hindi else
                    "Significant gender bias detected. Frequent use of gendered language and role associations.")
        else:
            return ("उच्च लिंग पूर्वाग्रह पाया गया। पूरे पाठ में व्यापक लैंगिक भाषा है।"
                    if is_hindi else
                    "High gender bias detected. Pervasive gendered language throughout the text.")
    
    def _explain_stereotype(self, score: float, text: str) -> str:
        """Generate explanation for stereotype bias."""
        if score < 0.2:
            return "No significant stereotypical patterns detected."
        elif score < 0.5:
            return "Some stereotypical associations identified in the text."
        else:
            return "Significant stereotypical patterns detected that may reinforce biases."
    
    def _explain_language_dominance(self, score: float) -> str:
        """Generate explanation for language dominance bias."""
        if score < 0.2:
            return "Minimal language dominance bias. Content is culturally inclusive."
        elif score < 0.5:
            return "Some English-centric or culturally specific references present."
        else:
            return "Significant language dominance bias with culturally specific assumptions."

    def _generate_alternative_text(self, content: str, spans: List[HighlightedSpan]) -> str:
        """
        Generate a bias-free alternative version of the text by replacing
        all detected biased spans with their neutral suggestions.
        Works for any input — URL-fetched, file-uploaded, or pasted text.
        """
        if not spans:
            return content

        # Sort spans by start position descending so replacements don't shift indices
        sorted_spans = sorted(spans, key=lambda s: s.span[0], reverse=True)

        result = content
        for span in sorted_spans:
            if not span.suggestion:
                continue
            start, end = span.span[0], span.span[1]
            if start < 0 or end > len(result) or start >= end:
                continue
            original = result[start:end]
            replacement = span.suggestion
            # Preserve capitalisation
            if original and original[0].isupper():
                replacement = replacement[0].upper() + replacement[1:]
            result = result[:start] + replacement + result[end:]

        return result
