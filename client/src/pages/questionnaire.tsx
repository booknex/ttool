import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
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
  ArrowLeft,
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
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

const sections = Array.from(new Set(questions.map((q) => q.section)));

function formatAnswer(answer: any, type: string): string {
  if (answer === undefined || answer === null) return "Not answered";
  if (type === "yes_no") return answer === true ? "Yes" : "No";
  if (type === "checkbox" && Array.isArray(answer)) return answer.join(", ");
  if (type === "number" && answer) return answer.toString();
  return String(answer);
}

export default function Questionnaire() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(true);
  const [tempAnswer, setTempAnswer] = useState<any>(null);
  const [editingAnswers, setEditingAnswers] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const isReviewing = user?.hasCompletedQuestionnaire === true;

  const { data: responses, isLoading } = useQuery<QuestionnaireResponse[]>({
    queryKey: ["/api/questionnaire"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("POST", "/api/questionnaire", { answers: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire"] });
      setHasChanges(false);
      toast({
        title: "Changes Saved",
        description: "Your questionnaire has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not save changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/questionnaire", { answers });
      await apiRequest("POST", "/api/auth/complete-questionnaire");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questionnaire"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Questionnaire Complete!",
        description: "Thank you for completing the questionnaire.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not complete the questionnaire. Please try again.",
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
      setEditingAnswers(loadedAnswers);
    }
  }, [responses]);

  const shouldShowQuestion = (q: Question, currentAnswers: Record<string, any>): boolean => {
    if (!q.dependsOn) return true;
    const dependentAnswer = currentAnswers[q.dependsOn.questionId];
    return dependentAnswer === q.dependsOn.answer;
  };

  const getVisibleQuestions = (currentAnswers: Record<string, any>) => {
    return questions.filter((q) => shouldShowQuestion(q, currentAnswers));
  };

  const visibleQuestions = getVisibleQuestions(answers);
  const currentQuestion = visibleQuestions[currentIndex];
  const progress = visibleQuestions.length > 0 
    ? Math.round(((currentIndex) / visibleQuestions.length) * 100) 
    : 0;

  const canGoBack = currentIndex > 0;

  useEffect(() => {
    if (currentQuestion) {
      setTempAnswer(answers[currentQuestion.id] ?? null);
    }
  }, [currentIndex, currentQuestion, answers]);

  const handleNext = () => {
    if (!currentQuestion) return;

    const newAnswers = { ...answers, [currentQuestion.id]: tempAnswer };
    setAnswers(newAnswers);

    const newVisibleQuestions = getVisibleQuestions(newAnswers);
    
    if (currentIndex >= newVisibleQuestions.length - 1) {
      completeMutation.mutate();
    } else {
      const nextIndex = Math.min(currentIndex + 1, newVisibleQuestions.length - 1);
      setCurrentIndex(nextIndex);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleCheckboxChange = (option: string, checked: boolean) => {
    const current = Array.isArray(tempAnswer) ? tempAnswer : [];
    const updated = checked
      ? [...current, option]
      : current.filter((o: string) => o !== option);
    setTempAnswer(updated);
  };

  const handleEditAnswer = (questionId: string, value: any) => {
    setEditingAnswers((prev) => ({ ...prev, [questionId]: value }));
    setHasChanges(true);
  };

  const handleEditCheckboxChange = (questionId: string, option: string, checked: boolean) => {
    const existing = editingAnswers[questionId];
    const current = Array.isArray(existing) ? existing : [];
    const updated = checked
      ? [...current, option]
      : current.filter((o: string) => o !== option);
    handleEditAnswer(questionId, updated);
  };

  const handleSaveChanges = () => {
    saveMutation.mutate(editingAnswers);
  };

  const hasAnswer = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.type === "checkbox") {
      return tempAnswer && tempAnswer.length > 0;
    }
    if (currentQuestion.type === "text" || currentQuestion.type === "number") {
      return tempAnswer !== null && tempAnswer !== undefined && tempAnswer !== "";
    }
    return tempAnswer !== null && tempAnswer !== undefined;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading questionnaire...</p>
        </div>
      </div>
    );
  }

  if (isReviewing) {
    const reviewVisibleQuestions = getVisibleQuestions(editingAnswers);
    
    return (
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Tax Questionnaire</h1>
                <p className="text-sm text-muted-foreground">Review and update your answers</p>
              </div>
            </div>
          </div>
          {hasChanges && (
            <Button onClick={handleSaveChanges} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          )}
        </div>

        {sections.map((section) => {
          const sectionQuestions = reviewVisibleQuestions.filter((q) => q.section === section);
          if (sectionQuestions.length === 0) return null;
          
          const SectionIcon = sectionIcons[section] || ClipboardCheck;
          
          return (
            <Card key={section}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <SectionIcon className="w-4 h-4 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{section}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {sectionQuestions.map((q, idx) => (
                  <div key={q.id}>
                    {idx > 0 && <Separator className="my-4" />}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">{q.question}</Label>
                      {q.helper && (
                        <p className="text-xs text-muted-foreground">{q.helper}</p>
                      )}
                      
                      {q.type === "yes_no" && (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={editingAnswers[q.id] === true ? "default" : "outline"}
                            onClick={() => handleEditAnswer(q.id, true)}
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={editingAnswers[q.id] === false ? "default" : "outline"}
                            onClick={() => handleEditAnswer(q.id, false)}
                          >
                            No
                          </Button>
                        </div>
                      )}

                      {q.type === "multiple" && q.options && (
                        <RadioGroup
                          value={editingAnswers[q.id] || ""}
                          onValueChange={(v) => handleEditAnswer(q.id, v)}
                          className="grid gap-2"
                        >
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-sm ${
                                editingAnswers[q.id] === opt 
                                  ? "border-primary bg-primary/5" 
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <RadioGroupItem value={opt} />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </RadioGroup>
                      )}

                      {q.type === "checkbox" && q.options && (
                        <div className="grid gap-2">
                          {q.options.map((opt) => {
                            const isChecked = (editingAnswers[q.id] || []).includes(opt);
                            return (
                              <label
                                key={opt}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-sm ${
                                  isChecked 
                                    ? "border-primary bg-primary/5" 
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={(checked) =>
                                    handleEditCheckboxChange(q.id, opt, checked as boolean)
                                  }
                                />
                                <span>{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {q.type === "text" && (
                        <Input
                          value={editingAnswers[q.id] || ""}
                          onChange={(e) => handleEditAnswer(q.id, e.target.value)}
                          placeholder="Type your answer..."
                          className="max-w-md"
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
                              value={editingAnswers[q.id] || ""}
                              onChange={(e) => handleEditAnswer(q.id, e.target.value)}
                              placeholder="0"
                              className={q.id.includes("amount") ? "pl-7" : ""}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {hasChanges && (
          <div className="sticky bottom-4">
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <p className="text-sm font-medium">You have unsaved changes</p>
                <Button onClick={handleSaveChanges} disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-green-500" />
          <h2 className="text-xl font-semibold">All Done!</h2>
          <p className="text-muted-foreground">Processing your responses...</p>
        </div>
      </div>
    );
  }

  const QuestionIcon = currentQuestion.icon || sectionIcons[currentQuestion.section] || ClipboardCheck;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent 
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <QuestionIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {currentQuestion.section}
                </p>
                <DialogTitle className="text-lg leading-tight">
                  Question {currentIndex + 1} of {visibleQuestions.length}
                </DialogTitle>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </DialogHeader>

          <div className="py-4 space-y-4">
            <DialogDescription asChild>
              <div className="space-y-2">
                <Label className="text-base font-medium text-foreground leading-relaxed block">
                  {currentQuestion.question}
                </Label>
                {currentQuestion.helper && (
                  <p className="text-sm text-muted-foreground">{currentQuestion.helper}</p>
                )}
              </div>
            </DialogDescription>

            <div className="pt-2">
              {currentQuestion.type === "yes_no" && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={tempAnswer === true ? "default" : "outline"}
                    className="flex-1 h-12"
                    onClick={() => setTempAnswer(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={tempAnswer === false ? "default" : "outline"}
                    className="flex-1 h-12"
                    onClick={() => setTempAnswer(false)}
                  >
                    No
                  </Button>
                </div>
              )}

              {currentQuestion.type === "multiple" && currentQuestion.options && (
                <RadioGroup
                  value={tempAnswer || ""}
                  onValueChange={(v) => setTempAnswer(v)}
                  className="grid gap-2"
                >
                  {currentQuestion.options.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        tempAnswer === opt 
                          ? "border-primary bg-primary/5" 
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value={opt} id={`${currentQuestion.id}-${opt}`} />
                      <span className="flex-1 text-sm">{opt}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === "checkbox" && currentQuestion.options && (
                <div className="grid gap-2 max-h-64 overflow-y-auto">
                  {currentQuestion.options.map((opt) => {
                    const isChecked = Array.isArray(tempAnswer) && tempAnswer.includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isChecked 
                            ? "border-primary bg-primary/5" 
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          id={`${currentQuestion.id}-${opt}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(opt, checked as boolean)
                          }
                        />
                        <span className="flex-1 text-sm">{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === "text" && (
                <Input
                  value={tempAnswer || ""}
                  onChange={(e) => setTempAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  className="h-12"
                  autoFocus
                />
              )}

              {currentQuestion.type === "number" && (
                <div className="relative">
                  {currentQuestion.id.includes("amount") && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  )}
                  <Input
                    type="number"
                    value={tempAnswer || ""}
                    onChange={(e) => setTempAnswer(e.target.value)}
                    placeholder="0"
                    className={`h-12 ${currentQuestion.id.includes("amount") ? "pl-7" : ""}`}
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={!canGoBack}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!hasAnswer() || completeMutation.isPending}
              className="gap-2 min-w-[100px]"
            >
              {completeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : currentIndex === visibleQuestions.length - 1 ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  Complete
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-auto">
        <div className="bg-card border rounded-lg shadow-lg p-3 flex items-center gap-3">
          <ClipboardCheck className="w-5 h-5 text-primary" />
          <div className="text-sm">
            <span className="font-medium">{Math.round(progress)}% complete</span>
            <span className="text-muted-foreground ml-2">
              ({currentIndex} of {visibleQuestions.length} questions)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
