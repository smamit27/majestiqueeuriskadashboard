import { useState, useEffect } from 'react';

const ALL_SUGGESTIONS = {
  general: [
    "What is the recovery percentage?",
    "Show financial summary.",
    "Latest notice.",
    "Show active visitors at the gate."
  ],
  maintenance: [
    "Who has pending maintenance?",
    "Show unpaid shops.",
    "Which shops owe money?",
    "What is the total pending balance for all shops?",
    "Show me the overall pending maintenance."
  ],
  finance: [
    "What is the monthly collection?",
    "Total expenses this month.",
    "Show me the electricity bill details.",
    "Show vendor payments.",
    "How much income did we generate?"
  ],
  operations: [
    "Show staff attendance for today.",
    "Which staff members are present?",
    "Did we pay the water bill?",
    "How many tasks are pending for the manager?"
  ],
  complaints: [
    "What are the open complaints?",
    "Are there any unresolved complaints?"
  ]
};

export function useSuggestedQuestions(category = 'general') {
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    const list = ALL_SUGGESTIONS[category] || ALL_SUGGESTIONS.general;
    // Shuffle and pick 4
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 4));
  }, [category]);

  const refreshSuggestions = () => {
    const list = ALL_SUGGESTIONS[category] || ALL_SUGGESTIONS.general;
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 4));
  };

  return { suggestions, refreshSuggestions };
}
