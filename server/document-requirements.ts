type DocumentRequirement = {
  type: string;
  description: string;
  isBusinessDoc: boolean; // true = business return, false = personal return
};

type QuestionnaireAnswer = {
  questionId: string;
  answer: any;
};

export function generateRequiredDocuments(responses: QuestionnaireAnswer[]): DocumentRequirement[] {
  const requirements: DocumentRequirement[] = [];
  const addedKeys = new Set<string>();

  const addRequirement = (type: string, description: string, isBusinessDoc: boolean = false) => {
    const key = `${type}::${description}::${isBusinessDoc}`;
    if (!addedKeys.has(key)) {
      addedKeys.add(key);
      requirements.push({ type, description, isBusinessDoc });
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

  // Income-based requirements (personal return)
  const employmentTypes = getAnswer("employment_type");
  if (Array.isArray(employmentTypes)) {
    if (employmentTypes.includes("W-2 Employment")) {
      addRequirement("w2", "W-2 from your employer(s)", false);
    }
    if (employmentTypes.includes("Self-Employment/1099")) {
      // Self-employment docs go to business return if they have a side business
      const hasSideBusiness = isYes("side_business");
      addRequirement("1099_nec", "1099-NEC for freelance or contract work", hasSideBusiness);
      addRequirement("business_expense", "Business expense receipts and records", hasSideBusiness);
    }
    if (employmentTypes.includes("Rental Income")) {
      addRequirement("other", "Rental income statements", true); // Business doc
      addRequirement("business_expense", "Rental property expense receipts", true); // Business doc
    }
    if (employmentTypes.includes("Investment Income")) {
      addRequirement("1099_int", "1099-INT for interest income", false);
      addRequirement("1099_div", "1099-DIV for dividend income", false);
      addRequirement("1099_b", "1099-B for stock sales", false);
      addRequirement("brokerage", "Brokerage statements", false);
    }
    if (employmentTypes.includes("Retirement Income")) {
      addRequirement("other", "1099-R for retirement distributions", false);
    }
    if (employmentTypes.includes("Social Security")) {
      addRequirement("other", "SSA-1099 for Social Security benefits", false);
    }
    if (employmentTypes.includes("Unemployment")) {
      addRequirement("other", "1099-G for unemployment compensation", false);
    }
  }

  // Side business - these go to business return
  if (isYes("side_business")) {
    addRequirement("1099_nec", "1099-NEC for freelance or contract work", true);
    addRequirement("1099_k", "1099-K for payment card and third-party transactions", true);
    addRequirement("business_expense", "Business expense receipts and records", true);
  }

  // Crypto transactions - personal return
  if (isYes("crypto_transactions")) {
    addRequirement("other", "Cryptocurrency transaction history/statements", false);
  }

  // Mortgage interest - personal return
  if (isYes("mortgage_interest")) {
    addRequirement("mortgage_interest", "Form 1098 for mortgage interest", false);
  }

  // Property taxes - personal return
  if (isYes("property_taxes")) {
    addRequirement("property_tax", "Property tax statements", false);
  }

  // Charitable donations - personal return
  if (isYes("charitable_donations")) {
    addRequirement("charitable_donation", "Charitable donation receipts", false);
  }

  // Medical expenses - personal return
  if (isYes("medical_expenses")) {
    addRequirement("medical_expense", "Medical expense receipts and statements", false);
  }

  // Student loans - personal return
  if (isYes("student_loans")) {
    addRequirement("other", "Form 1098-E for student loan interest", false);
  }

  // Education expenses - personal return
  if (isYes("education_expenses")) {
    addRequirement("other", "Form 1098-T for tuition payments", false);
  }

  // Childcare expenses - personal return
  if (isYes("childcare_expenses")) {
    addRequirement("other", "Childcare provider statements (for Form 2441)", false);
  }

  // 529 contributions - personal return
  if (isYes("529_contributions")) {
    addRequirement("other", "529 plan contribution statements", false);
  }

  // Dependents - personal return
  if (isYes("dependents")) {
    addRequirement("other", "Dependents' Social Security cards or numbers", false);
    addRequirement("other", "Birth certificates for dependents (if new)", false);
  }

  // Major life events - personal return
  const lifeEvents = getAnswer("major_life_events");
  if (Array.isArray(lifeEvents)) {
    if (lifeEvents.includes("Got married")) {
      addRequirement("other", "Marriage certificate", false);
      addRequirement("other", "Spouse's Social Security card", false);
    }
    if (lifeEvents.includes("Got divorced")) {
      addRequirement("other", "Divorce decree", false);
      addRequirement("other", "Alimony payment records (if applicable)", false);
    }
    if (lifeEvents.includes("Had a baby")) {
      addRequirement("other", "New baby's Social Security card", false);
      addRequirement("other", "Birth certificate for new child", false);
    }
    if (lifeEvents.includes("Bought a home")) {
      addRequirement("other", "Home purchase closing statement (HUD-1)", false);
    }
    if (lifeEvents.includes("Sold a home")) {
      addRequirement("other", "Home sale closing statement (HUD-1)", false);
      addRequirement("other", "Original home purchase documents for cost basis", false);
    }
    if (lifeEvents.includes("Changed jobs")) {
      addRequirement("other", "Final pay stub from previous employer", false);
    }
    if (lifeEvents.includes("Retired")) {
      addRequirement("other", "Retirement account distribution statements", false);
      addRequirement("other", "Pension income statements", false);
    }
  }

  // Home office - business doc if they have a side business
  if (isYes("home_office")) {
    const hasSideBusiness = isYes("side_business");
    addRequirement("other", "Home office measurements and expenses", hasSideBusiness);
  }

  // Vehicle for business - business doc if they have a side business
  if (isYes("vehicle_business_use")) {
    const hasSideBusiness = isYes("side_business");
    addRequirement("other", "Vehicle mileage log for business use", hasSideBusiness);
  }

  // Always require these standard documents - personal return
  addRequirement("other", "Government-issued photo ID", false);
  addRequirement("other", "Prior year tax return (if available)", false);

  return requirements;
}
