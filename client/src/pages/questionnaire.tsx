import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  CheckCircle2,
  Circle,
  Home,
  Briefcase,
  Heart,
  DollarSign,
  Building2,
  GraduationCap,
  Baby,
  Car,
  Loader2,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { QuestionnaireResponse } from "@shared/schema";

type Question = {
  id: string;
  section: string;
  question: string;
  type: "yes_no" | "multiple" | "text" | "number" | "checkbox";
  options?: string[];
  dependsOn?: { questionId: string; answer: string | boolean };
  icon?: any;
  helper?: string;
};

const sectionIcons: Record<string, any> = {
  "Filing Status": Home,
  "Income": DollarSign,
  "Deductions": Briefcase,
  "Education": GraduationCap,
  "Family": Baby,
  "Life Events": Heart,
};

const questions: Question[] = [
  // Filing Status
  {
    id: "filing_status",
    section: "Filing Status",
    question: "What is your filing status for 2024?",
    type: "multiple",
    options: ["Single", "Married Filing Jointly", "Married Filing Separately", "Head of Household", "Qualifying Widow(er)"],
    icon: Home,
  },
  {
    id: "marital_change",
    section: "Filing Status",
    question: "Did your marital status change during 2024?",
    type: "yes_no",
    icon: Heart,
  },

  // Income
  {
    id: "employment_type",
    section: "Income",
    question: "What type of income did you have in 2024?",
    type: "checkbox",
    options: ["W-2 Employment", "Self-Employment/1099", "Rental Income", "Investment Income", "Retirement Income", "Social Security", "Unemployment", "Other"],
    icon: Briefcase,
  },
  {
    id: "side_business",
    section: "Income",
    question: "Did you have any freelance or side business income?",
    type: "yes_no",
    icon: DollarSign,
  },
  {
    id: "side_business_type",
    section: "Income",
    question: "What type of side business did you operate?",
    type: "text",
    dependsOn: { questionId: "side_business", answer: true },
    helper: "e.g., Consulting, Rideshare, Etsy shop",
  },
  {
    id: "crypto_transactions",
    section: "Income",
    question: "Did you buy, sell, or trade cryptocurrency in 2024?",
    type: "yes_no",
    icon: DollarSign,
  },

  // Deductions
  {
    id: "homeowner",
    section: "Deductions",
    question: "Do you own your home?",
    type: "yes_no",
    icon: Home,
  },
  {
    id: "mortgage_interest",
    section: "Deductions",
    question: "Did you pay mortgage interest in 2024?",
    type: "yes_no",
    dependsOn: { questionId: "homeowner", answer: true },
  },
  {
    id: "property_taxes",
    section: "Deductions",
    question: "Did you pay property taxes in 2024?",
    type: "yes_no",
    dependsOn: { questionId: "homeowner", answer: true },
  },
  {
    id: "charitable_donations",
    section: "Deductions",
    question: "Did you make charitable donations in 2024?",
    type: "yes_no",
    icon: Heart,
  },
  {
    id: "charitable_amount",
    section: "Deductions",
    question: "Approximately how much did you donate to charity?",
    type: "number",
    dependsOn: { questionId: "charitable_donations", answer: true },
    helper: "Include both cash and non-cash donations",
  },
  {
    id: "medical_expenses",
    section: "Deductions",
    question: "Did you have significant medical expenses (more than 7.5% of income)?",
    type: "yes_no",
    icon: Heart,
  },

  // Education
  {
    id: "student_loans",
    section: "Education",
    question: "Did you pay student loan interest in 2024?",
    type: "yes_no",
    icon: GraduationCap,
  },
  {
    id: "education_expenses",
    section: "Education",
    question: "Did you or a dependent have education expenses?",
    type: "yes_no",
    icon: GraduationCap,
  },
  {
    id: "529_contributions",
    section: "Education",
    question: "Did you contribute to a 529 education savings plan?",
    type: "yes_no",
    icon: GraduationCap,
  },

  // Family
  {
    id: "dependents",
    section: "Family",
    question: "Do you have any dependents (children, elderly parents, etc.)?",
    type: "yes_no",
    icon: Baby,
  },
  {
    id: "dependent_count",
    section: "Family",
    question: "How many dependents do you have?",
    type: "number",
    dependsOn: { questionId: "dependents", answer: true },
  },
  {
    id: "childcare_expenses",
    section: "Family",
    question: "Did you pay for childcare or dependent care?",
    type: "yes_no",
    dependsOn: { questionId: "dependents", answer: true },
    icon: Baby,
  },

  // Life Events
  {
    id: "major_life_events",
    section: "Life Events",
    question: "Did you experience any major life events in 2024?",
    type: "checkbox",
    options: ["Got married", "Got divorced", "Had a baby", "Bought a home", "Sold a home", "Changed jobs", "Retired", "None of the above"],
    icon: Heart,
  },
  {
    id: "home_office",
    section: "Life Events",
    question: "Did you work from home and have a dedicated home office?",
    type: "yes_no",
    icon: Building2,
  },
  {
    id: "vehicle_business_use",
    section: "Life Events",
    question: "Did you use your vehicle for business purposes?",
    type: "yes_no",
    icon: Car,
  },
];

const sections = [...new Set(questions.map((q) => q.section))];

export default function Questionnaire() {
  const { toast } = useToast();
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);

  const { data: responses, isLoading } = useQuery<QuestionnaireResponse[]>({
    queryKey: ["/api/questionnaire"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("POST", "/api/questionnaire", { answers: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire"] });
      setSaved(true);
      toast({
        title: "Progress Saved",
        description: "Your questionnaire responses have been saved.",
      });
      setTimeout(() => setSaved(false), 3000);
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Could not save your responses. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (responses) {
      const loadedAnswers: Record<string, any> = {};
      responses.forEach((r) => {
        loadedAnswers[r.questionId] = r.answer;
      });
      setAnswers(loadedAnswers);
    }
  }, [responses]);

  const shouldShowQuestion = (q: Question): boolean => {
    if (!q.dependsOn) return true;
    const dependentAnswer = answers[q.dependsOn.questionId];
    return dependentAnswer === q.dependsOn.answer;
  };

  const currentSectionQuestions = questions.filter(
    (q) => q.section === sections[currentSection] && shouldShowQuestion(q)
  );

  const getSectionProgress = (sectionName: string) => {
    const sectionQuestions = questions.filter(
      (q) => q.section === sectionName && shouldShowQuestion(q)
    );
    const answered = sectionQuestions.filter((q) => answers[q.id] !== undefined).length;
    return sectionQuestions.length > 0 ? Math.round((answered / sectionQuestions.length) * 100) : 0;
  };

  const answeredCount = questions.filter(
    (q) => answers[q.id] !== undefined && shouldShowQuestion(q)
  ).length;
  const visibleCount = questions.filter(shouldShowQuestion).length;
  const progress = visibleCount > 0 ? Math.round((answeredCount / visibleCount) * 100) : 0;

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const current = answers[questionId] || [];
    const updated = checked
      ? [...current, option]
      : current.filter((o: string) => o !== option);
    handleAnswer(questionId, updated);
  };

  const handleSave = () => {
    saveMutation.mutate(answers);
  };

  const canGoNext = currentSection < sections.length - 1;
  const canGoPrev = currentSection > 0;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full" />
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <ClipboardCheck className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-questionnaire-title">
            Tax Questionnaire
          </h1>
          <p className="text-muted-foreground">
            Answer these questions to help us maximize your deductions
          </p>
        </div>
        {saved && (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Saved
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">{answeredCount} of {visibleCount} questions answered</span>
            <span className="text-sm font-semibold text-primary">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card className="sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sections</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 p-2">
                {sections.map((section, idx) => {
                  const SectionIcon = sectionIcons[section] || Circle;
                  const sectionProgress = getSectionProgress(section);
                  const isComplete = sectionProgress === 100;
                  const isCurrent = idx === currentSection;
                  
                  return (
                    <button
                      key={section}
                      onClick={() => setCurrentSection(idx)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        isCurrent 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-muted/50"
                      }`}
                      data-testid={`button-section-${section.toLowerCase().replace(' ', '-')}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isComplete 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : isCurrent 
                            ? "bg-primary/20" 
                            : "bg-muted"
                      }`}>
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <SectionIcon className={`w-4 h-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isCurrent ? "text-primary" : ""}`}>
                          {section}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {sectionProgress}% complete
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center gap-3">
                {(() => {
                  const SectionIcon = sectionIcons[sections[currentSection]] || Circle;
                  return (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <SectionIcon className="w-5 h-5 text-primary" />
                    </div>
                  );
                })()}
                <div>
                  <CardTitle>{sections[currentSection]}</CardTitle>
                  <CardDescription>
                    Section {currentSection + 1} of {sections.length}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {currentSectionQuestions.map((q, idx) => (
                <div key={q.id}>
                  {idx > 0 && <Separator className="mb-6" />}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-medium text-muted-foreground">
                        {idx + 1}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <Label className="text-base font-medium leading-relaxed">{q.question}</Label>
                        {q.helper && (
                          <p className="text-sm text-muted-foreground mt-1">{q.helper}</p>
                        )}
                      </div>
                    </div>

                    <div className="pl-10">
                      {q.type === "yes_no" && (
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant={answers[q.id] === true ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => handleAnswer(q.id, true)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Yes
                          </Button>
                          <Button
                            type="button"
                            variant={answers[q.id] === false ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => handleAnswer(q.id, false)}
                          >
                            No
                          </Button>
                        </div>
                      )}

                      {q.type === "multiple" && q.options && (
                        <RadioGroup
                          value={answers[q.id]}
                          onValueChange={(v) => handleAnswer(q.id, v)}
                          className="grid gap-2"
                        >
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                answers[q.id] === opt 
                                  ? "border-primary bg-primary/5" 
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                              <span className="flex-1">{opt}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}

                      {q.type === "checkbox" && q.options && (
                        <div className="grid gap-2">
                          {q.options.map((opt) => {
                            const isChecked = (answers[q.id] || []).includes(opt);
                            return (
                              <label
                                key={opt}
                                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                                  isChecked 
                                    ? "border-primary bg-primary/5" 
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <Checkbox
                                  id={`${q.id}-${opt}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleCheckboxChange(q.id, opt, checked as boolean)
                                  }
                                />
                                <span className="flex-1">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.type === "text" && (
                        <Input
                          value={answers[q.id] || ""}
                          onChange={(e) => handleAnswer(q.id, e.target.value)}
                          placeholder="Type your answer..."
                          className="max-w-md"
                          data-testid={`input-${q.id}`}
                        />
                      )}

                      {q.type === "number" && (
                        <div className="max-w-xs">
                          <div className="relative">
                            {q.id.includes("amount") && (
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                            )}
                            <Input
                              type="number"
                              value={answers[q.id] || ""}
                              onChange={(e) => handleAnswer(q.id, e.target.value)}
                              placeholder="0"
                              className={q.id.includes("amount") ? "pl-7" : ""}
                              data-testid={`input-${q.id}`}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {currentSectionQuestions.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-medium mb-1">All Done Here</h3>
                  <p className="text-muted-foreground text-sm">
                    No additional questions in this section based on your answers
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentSection((p) => p - 1)}
              disabled={!canGoPrev}
              data-testid="button-prev-section"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              data-testid="button-save-questionnaire"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Progress
                </>
              )}
            </Button>

            {canGoNext ? (
              <Button
                onClick={() => setCurrentSection((p) => p + 1)}
                data-testid="button-next-section"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleSave}
                disabled={saveMutation.isPending}
                data-testid="button-complete-questionnaire"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
