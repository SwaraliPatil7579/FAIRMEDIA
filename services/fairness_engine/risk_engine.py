"""
Risk Engine - Calculates risk levels and review requirements.
"""

from typing import Dict
import logging

logger = logging.getLogger(__name__)


def calculate_risk(bias_score: float) -> Dict[str, any]:
    """
    Calculate risk level and review requirements based on bias score.
    
    Args:
        bias_score: Overall bias score (0-1)
        
    Returns:
        Dictionary with risk_level, review_required, and additional details
    """
    if bias_score > 0.75:
        risk_level = "critical"
        review_required = True
        priority = "immediate"
        description = "Critical bias detected - immediate review and revision required"
        
    elif bias_score > 0.5:
        risk_level = "high"
        review_required = True
        priority = "high"
        description = "High bias detected - review and revision strongly recommended"
        
    elif bias_score > 0.25:
        risk_level = "medium"
        review_required = True
        priority = "medium"
        description = "Moderate bias detected - review recommended"
        
    else:
        risk_level = "low"
        review_required = False
        priority = "low"
        description = "Low bias detected - content is acceptable with minor improvements"
    
    result = {
        "risk_level": risk_level,
        "review_required": review_required,
        "priority": priority,
        "description": description,
        "bias_score": bias_score
    }
    
    logger.info(f"Risk calculated: {risk_level} (score: {bias_score:.2f})")
    
    return result


def assess_content_risk(
    gender_bias: float,
    stereotype: float,
    language_dominance: float
) -> Dict[str, any]:
    """
    Assess risk for individual bias components.
    
    Args:
        gender_bias: Gender bias score
        stereotype: Stereotype bias score
        language_dominance: Language dominance score
        
    Returns:
        Dictionary with component-level risk assessments
    """
    components = {
        'gender_bias': gender_bias,
        'stereotype': stereotype,
        'language_dominance': language_dominance
    }
    
    risk_assessment = {}
    
    for component, score in components.items():
        risk_assessment[component] = {
            'score': score,
            'risk': 'high' if score > 0.6 else 'medium' if score > 0.3 else 'low',
            'needs_attention': score > 0.4
        }
    
    return risk_assessment


if __name__ == "__main__":
    result = calculate_risk(0.7)
    print(result)