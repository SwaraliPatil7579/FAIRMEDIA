"""
Enhanced Bias Detection Service
Combines rule-based detection with advanced pattern matching
Supports English and Hindi languages
"""

import re
from typing import Dict, List, Optional

# Gender Bias Dictionaries
# Core pronouns
MALE_PRONOUNS = {"he", "him", "his", "himself"}
FEMALE_PRONOUNS = {"she", "her", "hers", "herself"}

# Common gendered words and roles that signal representation bias
MALE_WORDS = {
    "man", "men", "male", "boy", "boys", "gentleman", "gentlemen",
    "husband", "father", "son", "sons", "brother", "brothers"
}
FEMALE_WORDS = {
    "woman", "women", "female", "girl", "girls", "lady", "ladies",
    "wife", "mother", "daughter", "daughters", "sister", "sisters"
}

# Stereotypical gender-biased words/phrases (English)
GENDER_STEREOTYPE_WORDS = {
    "male_stereotypes": {
        "aggressive": "assertive",
        "bossy": "decisive",
        "ambitious": "driven",
        "dominant": "leading",
        "man up": "be brave",
        "boys don't cry": "it's okay to show emotion",
        "boys will be boys": "children should be held to equal standards",
        "be a man": "be strong",
        "real men": "people",
        "man of the house": "head of household",
        "man's job": "anyone's job",
        "chairman": "chairperson",
        "fireman": "firefighter",
        "policeman": "police officer",
        "businessman": "businessperson",
        "spokesman": "spokesperson",
        "mankind": "humankind",
        "manpower": "workforce",
        "foreman": "supervisor",
        "salesman": "salesperson",
    },
    "female_stereotypes": {
        "emotional": "expressive",
        "hysterical": "upset",
        "nurturing": "caring",
        "ditzy": "thoughtful",
        "nagging": "persistent",
        "lady doctor": "doctor",
        "lady engineer": "engineer",
        "lady scientist": "scientist",
        "lady lawyer": "lawyer",
        "working mother": "working parent",
        "career woman": "professional",
        "housewife": "homemaker",
        "old maid": "unmarried person",
        "tomboy": "active child",
        "weaker sex": "all people",
        "women belong in the kitchen": "people can work in any field",
        "women are too emotional": "all people experience emotions",
        "like a girl": "with effort",
    },
}

# Romanised Hindi / transliterated bias terms
# These appear in code-switched / Hinglish text written in Latin script
ROMANISED_HINDI_BIAS_TERMS = {
    "mardangi": {"neutral": "courage", "category": "toxic_masculinity"},
    "mardangi dikhao": {"neutral": "show courage", "category": "toxic_masculinity"},
    "rona band karo": {"neutral": "it is okay to express emotions", "category": "toxic_masculinity"},
    "ladke rote nahi": {"neutral": "emotions are natural", "category": "toxic_masculinity"},
    "ladke rote nahi hain": {"neutral": "emotions are natural", "category": "toxic_masculinity"},
    "mard ko dard nahi hota": {"neutral": "everyone feels pain", "category": "toxic_masculinity"},
    "pati parmeshwar": {"neutral": "equal life partner", "category": "patriarchy"},
    "abla nari": {"neutral": "woman", "category": "derogatory"},
    "paraya dhan": {"neutral": "daughter", "category": "gender_role"},
    "auraton ka kaam": {"neutral": "everyone's work", "category": "gender_role"},
    "ghar sambhalna": {"neutral": "household care", "category": "gender_role"},
    "kamzor ling": {"neutral": "person", "category": "derogatory"},
}

# Hindi biased terms with translations
HINDI_BIAS_TERMS = {
    # Gender roles
    "औरतों का काम": {
        "translation": "women's work",
        "neutral": "सभी का काम",
        "category": "gender_role",
    },
    "घर संभालना": {
        "translation": "managing the home (as women's duty)",
        "neutral": "घर की देखभाल",
        "category": "gender_role",
    },
    "बाहर की नौकरी नहीं": {
        "translation": "not for outside jobs",
        "neutral": "सभी को काम करने का अधिकार है",
        "category": "gender_role",
    },
    "पराया धन": {
        "translation": "someone else's wealth (daughters)",
        "neutral": "बेटी",
        "category": "gender_role",
    },
    "पत्नी को उसकी सेवा करनी चाहिए": {
        "translation": "wife should serve her husband",
        "neutral": "दोनों को एक-दूसरे का सम्मान करना चाहिए",
        "category": "gender_role",
    },
    "कठिन निर्णय नहीं लेने चाहिए": {
        "translation": "should not take difficult decisions",
        "neutral": "सभी को निर्णय लेने का अधिकार है",
        "category": "gender_role",
    },
    # Toxic masculinity
    "मर्दानगी": {
        "translation": "manliness/machismo",
        "neutral": "साहस",
        "category": "toxic_masculinity",
    },
    "मर्दानगी दिखाओ": {
        "translation": "show manliness",
        "neutral": "साहस दिखाओ",
        "category": "toxic_masculinity",
    },
    "रोना बंद करो": {
        "translation": "stop crying",
        "neutral": "भावनाएं व्यक्त करना स्वाभाविक है",
        "category": "toxic_masculinity",
    },
    "लड़के रोते नहीं": {
        "translation": "boys don't cry",
        "neutral": "भावनाएं स्वाभाविक हैं",
        "category": "toxic_masculinity",
    },
    "लड़के रोते नहीं हैं": {
        "translation": "boys don't cry",
        "neutral": "भावनाएं स्वाभाविक हैं",
        "category": "toxic_masculinity",
    },
    "मर्द को दर्द नहीं होता": {
        "translation": "men don't feel pain",
        "neutral": "सभी को दर्द होता है",
        "category": "toxic_masculinity",
    },
    "मर्द को दर्द नहीं": {
        "translation": "men don't feel pain",
        "neutral": "सभी को दर्द होता है",
        "category": "toxic_masculinity",
    },
    # Patriarchy / religious authority
    "पति परमेश्वर": {
        "translation": "husband is god",
        "neutral": "जीवन साथी",
        "category": "patriarchy",
    },
    "पति परमेश्वर होता है": {
        "translation": "husband is god",
        "neutral": "दोनों साथी बराबर हैं",
        "category": "patriarchy",
    },
    # Derogatory terms
    "अबला नारी": {
        "translation": "weak/helpless woman",
        "neutral": "महिला",
        "category": "derogatory",
    },
    "कमजोर लिंग": {
        "translation": "weaker sex",
        "neutral": "व्यक्ति",
        "category": "derogatory",
    },
    "अबला": {
        "translation": "helpless/weak (referring to women)",
        "neutral": "महिला",
        "category": "derogatory",
    },
}


class EnhancedBiasDetector:
    """Enhanced bias detection with multilingual support"""
    
    def __init__(self):
        self.male_pronouns = MALE_PRONOUNS
        self.female_pronouns = FEMALE_PRONOUNS
        self.gender_stereotypes = GENDER_STEREOTYPE_WORDS
        self.hindi_bias_terms = HINDI_BIAS_TERMS
        self.romanised_hindi_terms = ROMANISED_HINDI_BIAS_TERMS
    
    def detect_language(self, text: str) -> Dict:
        """Detect whether text contains English, Hindi, or mixed content"""
        hindi_chars = len(re.findall(r'[\u0900-\u097F]', text))
        english_chars = len(re.findall(r'[a-zA-Z]', text))
        total = hindi_chars + english_chars
        
        if total == 0:
            return {"detected": "unknown", "hindi_pct": 0, "english_pct": 0}
        
        hindi_pct = round(hindi_chars / total * 100, 1)
        english_pct = round(english_chars / total * 100, 1)
        
        if hindi_pct > 70:
            detected = "hi"
        elif english_pct > 70:
            detected = "en"
        else:
            detected = "mixed"
        
        return {
            "detected": detected,
            "hindi_pct": hindi_pct,
            "english_pct": english_pct
        }
    
    def detect_gender_bias(self, text: str) -> Dict:
        """Detect gender bias with detailed breakdown"""
        text_lower = text.lower()
        words = re.findall(r'\b\w+\b', text_lower)
        
        # Pronoun counting
        male_pronoun_count = sum(1 for w in words if w in self.male_pronouns)
        female_pronoun_count = sum(1 for w in words if w in self.female_pronouns)
        total_pronouns = male_pronoun_count + female_pronoun_count
        
        imbalance_score = (
            abs(male_pronoun_count - female_pronoun_count) / total_pronouns
            if total_pronouns > 0 else 0.0
        )
        
        # Gendered terms (man/woman, boy/girl, etc.)
        male_term_count = sum(1 for w in words if w in MALE_WORDS)
        female_term_count = sum(1 for w in words if w in FEMALE_WORDS)
        total_gender_terms = male_term_count + female_term_count
        
        term_imbalance_score = (
            abs(male_term_count - female_term_count) / total_gender_terms
            if total_gender_terms > 0 else 0.0
        )
        
        # Stereotype detection
        found_stereotypes = []
        for category, terms in self.gender_stereotypes.items():
            for word, alternative in terms.items():
                pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE)
                for match in pattern.finditer(text):
                    found_stereotypes.append({
                        "phrase": match.group(),
                        "type": category,
                        "suggestion": alternative,
                        "start": match.start(),
                        "end": match.end(),
                    })
        
        # Calculate bias score
        bias_points = 0
        # Pronoun imbalance (up to 4 points)
        bias_points += imbalance_score * 4
        # Overall gender term imbalance (up to 3 additional points)
        bias_points += term_imbalance_score * 3
        # Explicit stereotypes get higher weight (up to 4 points)
        bias_points += min(len(found_stereotypes) * 1.5, 4)
        
        # Cap at 10 and normalize to 0–1
        gender_bias_score = round(min(bias_points, 10), 2) / 10
        
        return {
            "male_pronoun_count": male_pronoun_count,
            "female_pronoun_count": female_pronoun_count,
            "male_term_count": male_term_count,
            "female_term_count": female_term_count,
            "imbalance_score": round(imbalance_score, 4),
            "term_imbalance_score": round(term_imbalance_score, 4),
            "stereotypes_found": found_stereotypes,
            "gender_bias_score": gender_bias_score,
            "total_issues": len(found_stereotypes),
        }
    
    def detect_hindi_bias(self, text: str) -> Dict:
        """Detect Hindi-specific biased terms — scans all occurrences."""
        found_terms = []
        # Sort longest phrases first so multi-word matches win
        sorted_terms = sorted(self.hindi_bias_terms.keys(), key=len, reverse=True)
        claimed = set()  # track char positions already matched

        for term in sorted_terms:
            info = self.hindi_bias_terms[term]
            start = 0
            while True:
                idx = text.find(term, start)
                if idx == -1:
                    break
                end = idx + len(term)
                # Skip if overlaps with an already-claimed span
                span_positions = set(range(idx, end))
                if span_positions & claimed:
                    start = end
                    continue
                claimed |= span_positions
                found_terms.append({
                    "phrase": term,
                    "translation": info["translation"],
                    "neutral_alternative": info["neutral"],
                    "category": info["category"],
                    "type": "hindi_bias",
                    "suggestion": info["neutral"],
                    "start": idx,
                    "end": end,
                })
                start = end

        # Each term contributes 0.25 to the score, capped at 1.0
        bias_score = min(len(found_terms) * 0.25, 1.0)

        return {
            "biased_terms_found": found_terms,
            "hindi_bias_score": bias_score,
            "total_issues": len(found_terms),
        }
    
    def detect_romanised_hindi_bias(self, text: str) -> Dict:
        """Detect transliterated / romanised Hindi bias terms in Latin-script text."""
        found_terms = []
        text_lower = text.lower()
        sorted_terms = sorted(self.romanised_hindi_terms.keys(), key=len, reverse=True)
        claimed = set()

        for term in sorted_terms:
            info = self.romanised_hindi_terms[term]
            pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
            for match in pattern.finditer(text_lower):
                span_positions = set(range(match.start(), match.end()))
                if span_positions & claimed:
                    continue
                claimed |= span_positions
                # Map back to original text position
                found_terms.append({
                    "phrase": text[match.start():match.end()],
                    "category": info["category"],
                    "type": "romanised_hindi_bias",
                    "suggestion": info["neutral"],
                    "neutral_alternative": info["neutral"],
                    "start": match.start(),
                    "end": match.end(),
                })

        bias_score = min(len(found_terms) * 0.25, 1.0)
        return {
            "biased_terms_found": found_terms,
            "romanised_hindi_bias_score": bias_score,
            "total_issues": len(found_terms),
        }

    def analyze(self, text: str) -> Dict:
        """Complete bias analysis — handles English, Hindi (Devanagari), and mixed/Hinglish."""
        lang_info = self.detect_language(text)

        # Always run all three detectors
        gender_result   = self.detect_gender_bias(text)
        hindi_result    = {"biased_terms_found": [], "hindi_bias_score": 0, "total_issues": 0}
        romanised_result = {"biased_terms_found": [], "romanised_hindi_bias_score": 0, "total_issues": 0}

        if lang_info["hindi_pct"] > 0:
            hindi_result = self.detect_hindi_bias(text)

        # Always check for romanised Hindi (present in Hinglish / code-switched text)
        romanised_result = self.detect_romanised_hindi_bias(text)

        gender_score    = gender_result["gender_bias_score"]
        hindi_score     = hindi_result["hindi_bias_score"]
        romanised_score = romanised_result["romanised_hindi_bias_score"]

        # Combined score: take the maximum signal across all detectors,
        # then add a small bonus for each additional detector that fired
        # (so mixed-language text with bias in both scripts scores higher).
        scores = [s for s in [gender_score, hindi_score, romanised_score] if s > 0]
        if not scores:
            combined_score = 0.0
        elif len(scores) == 1:
            combined_score = scores[0]
        else:
            # Max + 20% bonus per additional detector that fired, capped at 1.0
            combined_score = min(1.0, max(scores) + (len(scores) - 1) * 0.2)
        combined_score = round(combined_score, 2)

        # Language dominance: reflects how script-exclusive the content is.
        # Pure Hindi or pure English both score high (they exclude the other group).
        # Mixed text scores lower because it's more inclusive.
        hi_pct = lang_info["hindi_pct"]
        en_pct = lang_info["english_pct"]
        if hi_pct >= 70:
            language_dominance = round(hi_pct / 100.0, 2)
        elif en_pct >= 70:
            language_dominance = round(en_pct / 100.0, 2)
        else:
            # Mixed — lower dominance score
            language_dominance = round(max(hi_pct, en_pct) / 100.0 * 0.6, 2)

        all_issues = (
            gender_result["stereotypes_found"] +
            hindi_result["biased_terms_found"] +
            romanised_result["biased_terms_found"]
        )

        return {
            "language_info": lang_info,
            "gender_bias": gender_result,
            "hindi_bias": hindi_result,
            "romanised_hindi_bias": romanised_result,
            "language_dominance": language_dominance,
            "combined_bias_score": combined_score,
            "total_issues": len(all_issues),
            "all_biased_terms": all_issues,
        }
