"""
Fairness Engine - Main service for fairness calculation and mitigation.
Enhanced with Google Fairness Indicators integration.
"""

from typing import Dict, Optional
from schemas.ai_schema import BiasScores
from schemas.fairness_schema import FairnessResult, MitigationWeights
from services.fairness_engine.mitigation_utils import (
    calculate_weight_adjustment,
    generate_recommendations,
    calculate_fairness_score,
    determine_risk_level,
    calculate_detailed_metrics
)
from services.fairness_engine.risk_engine import calculate_risk
from services.fairness_engine.fairness_indicators_mock import get_fairness_indicators
import logging

logger = logging.getLogger(__name__)


class FairnessEngine:
    """
    Main fairness engine that calculates risk and generates mitigation strategies.
    Enhanced with Google Fairness Indicators.
    """
    
    def __init__(self, use_google_fairness: bool = True):
        """
        Initialize Fairness Engine.
        
        Args:
            use_google_fairness: Enable Google Fairness Indicators (mock mode for free tier)
        """
        self.use_google_fairness = use_google_fairness
        if use_google_fairness:
            self.fairness_indicators = get_fairness_indicators(use_real_lib=False)
            logger.info("⚖️  Fairness Engine initialized with Google Fairness Indicators (mock mode)")
        else:
            self.fairness_indicators = None
            logger.info("⚖️  Fairness Engine initialized")
    
    async def calculate_fairness(
        self,
        bias_scores: BiasScores,
        content: str,
        analysis_id: str,
        metadata: Optional[Dict] = None
    ) -> FairnessResult:
        """
        Calculate fairness metrics and generate recommendations.
        
        Args:
            bias_scores: Bias scores from AI service
            content: Original text content
            analysis_id: Unique identifier
            metadata: Optional additional metadata
            
        Returns:
            FairnessResult with risk level and recommendations
        """
        logger.info(f"⚖️  Calculating fairness for {analysis_id}")
        
        # Convert bias scores to dict
        bias_dict = {
            'gender_bias': bias_scores.gender_bias,
            'stereotype': bias_scores.stereotype,
            'language_dominance': bias_scores.language_dominance,
            'overall': bias_scores.overall
        }
        
        # Determine risk level
        risk_level = determine_risk_level(bias_scores.overall)
        
        # Calculate risk details
        risk_details = calculate_risk(bias_scores.overall)
        
        # Calculate fairness score
        fairness_score = calculate_fairness_score(bias_dict)
        
        # Generate recommendations
        recommendations = generate_recommendations(bias_dict, risk_level)
        
        # Calculate weight adjustment
        adjusted_weight, adjustment_factor, rationale = calculate_weight_adjustment(
            bias_scores.overall,
            risk_level
        )
        
        # Calculate detailed metrics
        detailed_metrics = calculate_detailed_metrics(bias_dict)
        
        # Add Google Fairness Indicators metrics if enabled
        if self.use_google_fairness and self.fairness_indicators:
            try:
                fairness_metrics = self.fairness_indicators.calculate_fairness_metrics(
                    bias_scores=bias_dict
                )
                fairness_report = self.fairness_indicators.generate_fairness_report(
                    fairness_metrics
                )
                
                # Add to detailed metrics
                detailed_metrics['google_fairness_indicators'] = fairness_report
                
                # Enhance recommendations with fairness-specific ones
                recommendations.extend(fairness_report.get('recommendations', []))
                
                logger.info(
                    f"✅ Google Fairness Indicators: "
                    f"score={fairness_report['summary']['overall_fairness']:.2f}, "
                    f"passed={fairness_report['summary']['passed_metrics']}/4 metrics"
                )
            except Exception as e:
                logger.warning(f"⚠️  Google Fairness Indicators failed: {e}")
        
        result = FairnessResult(
            risk_level=risk_level,
            fairness_score=fairness_score,
            recommendations=recommendations,
            mitigation_weights=MitigationWeights(
                original_weight=1.0,
                adjusted_weight=adjusted_weight,
                adjustment_factor=adjustment_factor,
                rationale=rationale
            ),
            detailed_metrics=detailed_metrics,
            engine_version="fairness-v2.0.0-google"
        )
        
        logger.info(
            f"✅ Fairness calculated: risk={risk_level}, "
            f"score={fairness_score:.2f}, "
            f"recommendations={len(recommendations)}"
        )
        
        return result


# Legacy function for backward compatibility
def calculate_fairness(bias_score, original_score):
    """Legacy function - kept for backward compatibility."""
    fairness_adjusted_score = original_score - (bias_score * 0.5)
    if fairness_adjusted_score < 0:
        fairness_adjusted_score = 0
    return {
        "fairness_score": round(fairness_adjusted_score, 2)
    }


if __name__ == "__main__":
    result = calculate_fairness(0.7, 0.9)
    print("Fairness Result:", result)