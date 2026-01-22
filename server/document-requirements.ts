type DocumentRequirement = {
  type: string;
  description: string;
};

type QuestionnaireAnswer = {
  questionId: string;
  answer: any;
};

export function generateRequiredDocuments(responses: QuestionnaireAnswer[]): DocumentRequirement[] {
  const requirements: DocumentRequirement[] = [];
  const addedKeys = new Set<string>();

  const addRequirement = (type: string, description: string) => {
    const key = `${type}::${description}`;
    if (!addedKeys.has(key)) {
      addedKeys.add(key);
      requirements.push({ type, description });
    }
  };

  const getAnswer = (questionId: string): any => {
    const response = responses.find(r => r.questionId === questionId);
    return response?.answer;
  };

  const hasCheckboxOption = (questionId: string, option: string): boolean => {
    const answer = getAnswer(questionId);
    if (Array.isArray(answer)) {
      return answer.includes(option);
    }
    return false;
  };

  const isYes = (questionId: string): boolean => {
    return getAnswer(questionId) === true;
  };

  // Income-based requirements
  const employmentTypes = getAnswer("employment_type");
  if (Array.isArray(employmentTypes)) {
    if (employmentTypes.includes("W-2 Employment")) {
      addRequirement("w2", "W-2 from your employer(s)");
    }
    if (employmentTypes.includes("Self-Employment/1099")) {
      addRequirement("1099_nec", "1099-NEC for freelance or contract work");
      addRequirement("business_expense", "Business expense receipts and records");
    }
    if (employmentTypes.includes("Rental Income")) {
      addRequirement("other", "Rental income statements");
      addRequirement("business_expense", "Rental property expense receipts");
    }
    if (employmentTypes.includes("Investment Income")) {
      addRequirement("1099_int", "1099-INT for interest income");
      addRequirement("1099_div", "1099-DIV for dividend income");
      addRequirement("1099_b", "1099-B for stock sales");
      addRequirement("brokerage", "Brokerage statements");
    }
    if (employmentTypes.includes("Retirement Income")) {
      addRequirement("other", "1099-R for retirement distributions");
    }
    if (employmentTypes.includes("Social Security")) {
      addRequirement("other", "SSA-1099 for Social Security benefits");
    }
    if (employmentTypes.includes("Unemployment")) {
      addRequirement("other", "1099-G for unemployment compensation");
    }
  }

  // Side business
  if (isYes("side_business")) {
    addRequirement("1099_nec", "1099-NEC for freelance or contract work");
    addRequirement("1099_k", "1099-K for payment card and third-party transactions");
    addRequirement("business_expense", "Business expense receipts and records");
  }

  // Crypto transactions
  if (isYes("crypto_transactions")) {
    addRequirement("other", "Cryptocurrency transaction history/statements");
  }

  // Mortgage interest
  if (isYes("mortgage_interest")) {
    addRequirement("mortgage_interest", "Form 1098 for mortgage interest");
  }

  // Property taxes
  if (isYes("property_taxes")) {
    addRequirement("property_tax", "Property tax statements");
  }

  // Charitable donations
  if (isYes("charitable_donations")) {
    addRequirement("charitable_donation", "Charitable donation receipts");
  }

  // Medical expenses
  if (isYes("medical_expenses")) {
    addRequirement("medical_expense", "Medical expense receipts and statements");
  }

  // Student loans
  if (isYes("student_loans")) {
    addRequirement("other", "Form 1098-E for student loan interest");
  }

  // Education expenses
  if (isYes("education_expenses")) {
    addRequirement("other", "Form 1098-T for tuition payments");
  }

  // Childcare expenses
  if (isYes("childcare_expenses")) {
    addRequirement("other", "Childcare provider statements (for Form 2441)");
  }

  // 529 contributions
  if (isYes("529_contributions")) {
    addRequirement("other", "529 plan contribution statements");
  }

  // Dependents - need SSN/birth certificates
  if (isYes("dependents")) {
    addRequirement("other", "Dependents' Social Security cards or numbers");
    addRequirement("other", "Birth certificates for dependents (if new)");
  }

  // Major life events
  const lifeEvents = getAnswer("major_life_events");
  if (Array.isArray(lifeEvents)) {
    if (lifeEvents.includes("Got married")) {
      addRequirement("other", "Marriage certificate");
      addRequirement("other", "Spouse's Social Security card");
    }
    if (lifeEvents.includes("Got divorced")) {
      addRequirement("other", "Divorce decree");
      addRequirement("other", "Alimony payment records (if applicable)");
    }
    if (lifeEvents.includes("Had a baby")) {
      addRequirement("other", "New baby's Social Security card");
      addRequirement("other", "Birth certificate for new child");
    }
    if (lifeEvents.includes("Bought a home")) {
      addRequirement("other", "Home purchase closing statement (HUD-1)");
    }
    if (lifeEvents.includes("Sold a home")) {
      addRequirement("other", "Home sale closing statement (HUD-1)");
      addRequirement("other", "Original home purchase documents for cost basis");
    }
    if (lifeEvents.includes("Changed jobs")) {
      addRequirement("other", "Final pay stub from previous employer");
    }
    if (lifeEvents.includes("Retired")) {
      addRequirement("other", "Retirement account distribution statements");
      addRequirement("other", "Pension income statements");
    }
  }

  // Home office
  if (isYes("home_office")) {
    addRequirement("other", "Home office measurements and expenses");
  }

  // Vehicle for business
  if (isYes("vehicle_business_use")) {
    addRequirement("other", "Vehicle mileage log for business use");
  }

  // Always require these standard documents
  addRequirement("other", "Government-issued photo ID");
  addRequirement("other", "Prior year tax return (if available)");

  return requirements;
}
