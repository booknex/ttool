import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileText,
  ClipboardList,
  PenTool,
  ListChecks,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const ONBOARDING_STEPS = [
  {
    title: "Welcome to TaxPortal",
    description: "Your secure portal for managing your tax preparation. Let's walk through how to get started.",
    icon: Sparkles,
    content: (
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <p className="text-muted-foreground">
          We'll guide you through the tax preparation process step by step. 
          This portal makes it easy to upload documents, answer questions, and track your return.
        </p>
      </div>
    ),
  },
  {
    title: "Step 1: Upload Your Documents",
    description: "Start by uploading your tax documents like W-2s, 1099s, and other forms.",
    icon: FileText,
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <FileText className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-1">Document Center</h4>
            <p className="text-sm text-muted-foreground">
              Go to the <strong>Documents</strong> page to upload your tax forms. 
              Our system will automatically recognize common document types like W-2s and 1099s.
            </p>
          </div>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2 pl-4">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            W-2 forms from employers
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            1099 forms for freelance or investment income
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Mortgage interest statements (1098)
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Charitable donation receipts
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: "Step 2: Complete the Questionnaire",
    description: "Answer questions about your tax situation to help us prepare your return.",
    icon: ClipboardList,
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <ClipboardList className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-1">Tax Questionnaire</h4>
            <p className="text-sm text-muted-foreground">
              Visit the <strong>Questionnaire</strong> page to answer questions about your 
              income, deductions, and life changes. This helps us maximize your refund.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          The questionnaire covers topics like employment, home ownership, 
          dependents, and major life events. Take your time - you can save 
          your progress and come back later.
        </p>
      </div>
    ),
  },
  {
    title: "Step 3: Sign Required Documents",
    description: "E-sign the engagement letter and authorization forms electronically.",
    icon: PenTool,
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <PenTool className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-1">E-Signatures</h4>
            <p className="text-sm text-muted-foreground">
              Go to the <strong>E-Signatures</strong> page to sign required documents. 
              You'll need to sign the engagement letter to authorize us to prepare your return.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Later in the process, you'll also sign Form 8879 to authorize e-filing 
          once your return is ready for submission.
        </p>
      </div>
    ),
  },
  {
    title: "Step 4: Track Your Progress",
    description: "Monitor your return status and communicate with your preparer.",
    icon: ListChecks,
    content: (
      <div className="space-y-4">
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <ListChecks className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-1">Return Status</h4>
            <p className="text-sm text-muted-foreground">
              Check the <strong>Return Status</strong> page anytime to see where 
              your return is in the preparation process.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
          <MessageSquare className="w-8 h-8 text-primary flex-shrink-0" />
          <div>
            <h4 className="font-medium mb-1">Messages</h4>
            <p className="text-sm text-muted-foreground">
              Use the <strong>Messages</strong> page to communicate securely with 
              your tax preparer if you have questions.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: "You're All Set!",
    description: "You're ready to start your tax preparation journey.",
    icon: CheckCircle2,
    content: (
      <div className="space-y-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <p className="text-muted-foreground">
          Start by uploading your documents, then complete the questionnaire. 
          Your tax preparer will guide you through the rest of the process.
        </p>
        <p className="text-sm text-muted-foreground">
          You can always access this information from your dashboard or return to any 
          section using the sidebar navigation.
        </p>
      </div>
    ),
  },
];

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const currentStep = ONBOARDING_STEPS[step];
  const isLastStep = step === ONBOARDING_STEPS.length - 1;
  const isFirstStep = step === 0;

  const completeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/complete-onboarding");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    },
  });

  const handleNext = () => {
    if (isLastStep) {
      completeMutation.mutate();
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    completeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <currentStep.icon className="w-5 h-5 text-primary" />
            {currentStep.title}
          </DialogTitle>
          <DialogDescription>{currentStep.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4">{currentStep.content}</div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? "bg-primary" : i < step ? "bg-primary/50" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button variant="outline" onClick={handleBack} size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            {isFirstStep && (
              <Button variant="ghost" onClick={handleSkip} size="sm">
                Skip Tour
              </Button>
            )}
            <Button 
              onClick={handleNext} 
              size="sm"
              disabled={completeMutation.isPending}
              data-testid="button-onboarding-next"
            >
              {completeMutation.isPending 
                ? "Finishing..." 
                : isLastStep 
                  ? "Get Started" 
                  : "Next"}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
