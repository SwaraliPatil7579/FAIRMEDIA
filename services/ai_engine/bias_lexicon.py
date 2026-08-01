"""Shared multilingual bias lexicon for deterministic fallback detection.

This lexicon is intentionally conservative: every entry should be a phrase we
can flag with a concrete neutral alternative and a stable category. LLM services
can still catch context-sensitive cases, but this keeps deployment behavior
useful when external model calls fail.
"""

from __future__ import annotations

from typing import Dict, TypedDict


class LexiconEntry(TypedDict):
    suggestion: str
    category: str


BiasLexicon = Dict[str, LexiconEntry]


DEVANAGARI_BIAS_TERMS: BiasLexicon = {
    "औरतों का काम सिर्फ घर संभालना है": {
        "suggestion": "सभी लोग घर और काम दोनों संभाल सकते हैं",
        "category": "gender_bias",
    },
    "औरतों का काम": {
        "suggestion": "सभी का काम",
        "category": "gender_bias",
    },
    "पुरुषों को ही बड़े फैसले लेने चाहिए": {
        "suggestion": "योग्य लोग बड़े फैसले ले सकते हैं",
        "category": "gender_bias",
    },
    "लड़के रोते नहीं हैं": {
        "suggestion": "भावनाएं सभी के लिए स्वाभाविक हैं",
        "category": "stereotype",
    },
    "लड़के रोते नहीं": {
        "suggestion": "भावनाएं सभी के लिए स्वाभाविक हैं",
        "category": "stereotype",
    },
    "मर्द को दर्द नहीं होता": {
        "suggestion": "सभी को दर्द होता है",
        "category": "stereotype",
    },
    "मर्दानगी दिखाओ": {
        "suggestion": "साहस दिखाओ",
        "category": "stereotype",
    },
    "मर्दानगी": {
        "suggestion": "साहस",
        "category": "stereotype",
    },
    "पति परमेश्वर होता है": {
        "suggestion": "दोनों साथी बराबर हैं",
        "category": "gender_bias",
    },
    "पति परमेश्वर": {
        "suggestion": "जीवन साथी",
        "category": "gender_bias",
    },
    "पराया धन": {
        "suggestion": "बेटी",
        "category": "gender_bias",
    },
    "कमजोर लिंग": {
        "suggestion": "व्यक्ति",
        "category": "gender_bias",
    },
    "अबला नारी": {
        "suggestion": "महिला",
        "category": "gender_bias",
    },
    "घर संभालना": {
        "suggestion": "घर की देखभाल",
        "category": "gender_bias",
    },
    "बाहर की नौकरी नहीं": {
        "suggestion": "सभी को काम करने का अधिकार है",
        "category": "gender_bias",
    },
    "गरीब लोग आलसी होते हैं": {
        "suggestion": "गरीबी में रहने वाले लोग कई बाधाओं का सामना करते हैं",
        "category": "socioeconomic_bias",
    },
    "गांव के लोग कम पढ़े लिखे होते हैं": {
        "suggestion": "शिक्षा और क्षमता व्यक्ति पर निर्भर करती है",
        "category": "socioeconomic_bias",
    },
    "अंग्रेजी बोलने वाले ही योग्य हैं": {
        "suggestion": "योग्यता भाषा से स्वतंत्र हो सकती है",
        "category": "language_dominance",
    },
    "हिंदी बोलने वाले ज्यादा देशभक्त हैं": {
        "suggestion": "देशभक्ति भाषा से तय नहीं होती",
        "category": "language_dominance",
    },
}


ROMANISED_INDIC_BIAS_TERMS: BiasLexicon = {
    "ladkiyon ko leadership roles nahi dene chahiye": {
        "suggestion": "leadership roles should be based on ability",
        "category": "gender_bias",
    },
    "auratein tough decisions nahi le sakti": {
        "suggestion": "decision-making ability is not based on gender",
        "category": "gender_bias",
    },
    "mardon ko leadership leni chahiye": {
        "suggestion": "leadership should be based on ability",
        "category": "gender_bias",
    },
    "ladkon ko kabhi rona nahi chahiye": {
        "suggestion": "everyone can express emotions",
        "category": "stereotype",
    },
    "mardangi dikhao": {
        "suggestion": "show courage",
        "category": "stereotype",
    },
    "show mardangi": {
        "suggestion": "show courage",
        "category": "stereotype",
    },
    "mardangi": {
        "suggestion": "courage",
        "category": "stereotype",
    },
    "rona band karo": {
        "suggestion": "it is okay to express emotions",
        "category": "stereotype",
    },
    "ladke rote nahi hain": {
        "suggestion": "emotions are natural",
        "category": "stereotype",
    },
    "ladke rote nahi": {
        "suggestion": "emotions are natural",
        "category": "stereotype",
    },
    "mard ko dard nahi hota": {
        "suggestion": "everyone feels pain",
        "category": "stereotype",
    },
    "pati parmeshwar": {
        "suggestion": "equal life partner",
        "category": "gender_bias",
    },
    "abla nari": {
        "suggestion": "woman",
        "category": "gender_bias",
    },
    "paraya dhan": {
        "suggestion": "daughter",
        "category": "gender_bias",
    },
    "auraton ka kaam": {
        "suggestion": "everyone's work",
        "category": "gender_bias",
    },
    "kamzor ling": {
        "suggestion": "person",
        "category": "gender_bias",
    },
    "mulgi leadership sathi emotional aste": {
        "suggestion": "leadership ability is not based on gender",
        "category": "gender_bias",
    },
    "mulga naturally strong leader asto": {
        "suggestion": "leadership ability varies by individual",
        "category": "gender_bias",
    },
    "female employees na support work dya": {
        "suggestion": "assign work based on skills",
        "category": "gender_bias",
    },
    "men na client decisions handle karu dya": {
        "suggestion": "qualified employees can handle client decisions",
        "category": "gender_bias",
    },
    "women leadership ki suitable kaadu": {
        "suggestion": "leadership suitability is not based on gender",
        "category": "gender_bias",
    },
    "women ra pressure handle korte pare na": {
        "suggestion": "people vary in how they handle pressure",
        "category": "gender_bias",
    },
    "women leadership mate emotional hoy chhe": {
        "suggestion": "leadership ability is not based on gender",
        "category": "gender_bias",
    },
    "women pressure handle nahi kar sakdiyan": {
        "suggestion": "people vary in how they handle pressure",
        "category": "gender_bias",
    },
}


ADDITIONAL_BIAS_PATTERNS: BiasLexicon = {
    "asian developers are naturally good at math": {
        "suggestion": "developers with strong technical skills",
        "category": "racial_ethnic_bias",
    },
    "asians are good at math": {
        "suggestion": "individuals may have strong math skills",
        "category": "racial_ethnic_bias",
    },
    "model minority": {
        "suggestion": "high-achieving individual",
        "category": "racial_ethnic_bias",
    },
    "you speak english so well": {
        "suggestion": "you communicate effectively",
        "category": "racial_ethnic_bias",
    },
    "where are you really from": {
        "suggestion": "what is your background",
        "category": "racial_ethnic_bias",
    },
    "one of the good ones": {
        "suggestion": "a valued colleague",
        "category": "racial_ethnic_bias",
    },
    "lower caste": {
        "suggestion": "person from a historically marginalized caste",
        "category": "caste_bias",
    },
    "upper caste values": {
        "suggestion": "shared team values",
        "category": "caste_bias",
    },
    "tribal communities are backward": {
        "suggestion": "tribal communities have diverse cultures and strengths",
        "category": "caste_bias",
    },
    "fat people are lazy": {
        "suggestion": "people have different body types and circumstances",
        "category": "body_bias",
    },
    "overweight candidates lack discipline": {
        "suggestion": "evaluate candidates by role-relevant skills",
        "category": "body_bias",
    },
    "native english speakers only": {
        "suggestion": "people with required language proficiency",
        "category": "language_dominance",
    },
    "native english speakers": {
        "suggestion": "proficient English speakers",
        "category": "language_dominance",
    },
    "regional accent": {
        "suggestion": "accent",
        "category": "language_dominance",
    },
    "american values": {
        "suggestion": "shared team values",
        "category": "nationality_bias",
    },
    "foreign workers": {
        "suggestion": "international workers",
        "category": "nationality_bias",
    },
    "immigrants take jobs": {
        "suggestion": "labor market changes have many causes",
        "category": "nationality_bias",
    },
}

