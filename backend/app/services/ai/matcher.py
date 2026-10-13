import re
from typing import List, Optional, Tuple
from app.models.product import Product
from app.models.customer import Customer


def normalize_text(text: str) -> str:
    if not text:
        return ""
    # Lowercase, replace non-alphanumeric with spaces, collapse spaces
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return " ".join(cleaned.split())


def match_product(query_name: str, products: List[Product]) -> Tuple[Optional[Product], float, Optional[str]]:
    """
    Deterministically matches an extracted product name against catalogue products.
    Returns (Product or None, confidence_score 0.0-1.0, reason_or_warning)
    """
    if not query_name or not query_name.strip():
        return None, 0.0, "Empty product name"

    clean_query = normalize_text(query_name)
    query_tokens = set(clean_query.split())

    # 1. Exact SKU match
    for p in products:
        if p.sku.lower() == query_name.strip().lower() or normalize_text(p.sku) == clean_query:
            return p, 1.0, None

    # 2. Exact Name match (normalized)
    for p in products:
        if normalize_text(p.name) == clean_query:
            return p, 0.98, None

    # 3. Exact Alias match
    for p in products:
        for alias in p.aliases_list:
            if normalize_text(alias) == clean_query:
                return p, 0.95, None

    # 4. Token Substring / Token Overlap Match
    best_match = None
    best_score = 0.0

    for p in products:
        norm_name = normalize_text(p.name)
        prod_tokens = set(norm_name.split())

        # Check if query is fully contained in product name
        if clean_query in norm_name or norm_name in clean_query:
            score = 0.85
            if score > best_score:
                best_score = score
                best_match = p
            continue

        # Check alias containment
        alias_matched = False
        for alias in p.aliases_list:
            norm_alias = normalize_text(alias)
            if clean_query in norm_alias or norm_alias in clean_query:
                score = 0.82
                if score > best_score:
                    best_score = score
                    best_match = p
                    alias_matched = True
                break
        if alias_matched:
            continue

        # Jaccard Token Overlap
        if query_tokens and prod_tokens:
            overlap = query_tokens.intersection(prod_tokens)
            score = len(overlap) / len(query_tokens.union(prod_tokens))
            if score > 0.5 and score > best_score:
                best_score = score
                best_match = p

    if best_match and best_score >= 0.6:
        return best_match, round(best_score, 2), None

    return None, 0.0, "No confident catalogue match found"


def match_customer(query_name: Optional[str], customers: List[Customer]) -> Tuple[Optional[Customer], float]:
    if not query_name or not query_name.strip():
        return None, 0.0

    clean_query = normalize_text(query_name)
    query_tokens = set(clean_query.split())

    # Exact match on name or business name
    for c in customers:
        if normalize_text(c.name) == clean_query or (c.business_name and normalize_text(c.business_name) == clean_query):
            return c, 1.0

    # Substring or token overlap
    for c in customers:
        norm_name = normalize_text(c.name)
        norm_biz = normalize_text(c.business_name) if c.business_name else ""
        if clean_query in norm_name or norm_name in clean_query:
            return c, 0.85
        if norm_biz and (clean_query in norm_biz or norm_biz in clean_query):
            return c, 0.85

    return None, 0.0
