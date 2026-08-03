from src.core.cost_tracker import calculate_cost


def test_known_provider_and_model_computes_expected_cost():
    # gpt-4o-mini: input $0.00015/1K, output $0.0006/1K
    cost = calculate_cost("openai", "gpt-4o-mini", prompt_tokens=1000, response_tokens=1000)
    assert cost == 0.00015 + 0.0006


def test_unknown_provider_returns_zero():
    assert calculate_cost("anthropic", "claude-x", 1000, 1000) == 0.0


def test_unknown_model_for_known_provider_returns_zero():
    assert calculate_cost("openai", "gpt-does-not-exist", 1000, 1000) == 0.0


def test_zero_tokens_costs_nothing():
    assert calculate_cost("openai", "gpt-4o-mini", 0, 0) == 0.0


def test_ollama_local_models_are_free():
    assert calculate_cost("ollama", "llama3", 5000, 5000) == 0.0
