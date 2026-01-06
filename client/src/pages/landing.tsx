import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  Shield,
  FileText,
  MessageSquare,
  DollarSign,
  PenTool,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Document Upload",
    description: "Securely upload tax documents with automatic form recognition",
  },
  {
    icon: Shield,
    title: "Bank-Level Security",
    description: "Your data is encrypted and protected with enterprise security",
  },
  {
    icon: MessageSquare,
    title: "Direct Communication",
    description: "Message your tax preparer directly within the portal",
  },
  {
    icon: DollarSign,
    title: "Refund Tracking",
    description: "Track your federal and state refund status in real-time",
  },
  {
    icon: PenTool,
    title: "E-Signatures",
    description: "Sign engagement letters and IRS forms electronically",
  },
  {
    icon: ClipboardList,
    title: "Smart Questionnaire",
    description: "Answer tailored questions to maximize your deductions",
  },
];

const benefits = [
  "Upload documents from any device",
  "Track your refund status 24/7",
  "Secure messaging with your tax pro",
  "Pay online with multiple options",
  "Sign forms electronically",
  "Access your tax history anytime",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/affiliate/login">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary text-primary-foreground cursor-pointer hover:opacity-80 transition-opacity">
                <Shield className="w-5 h-5" />
              </div>
            </Link>
            <span className="font-semibold text-lg">TaxPortal</span>
          </div>
          <Button asChild data-testid="button-header-login">
            <a href="/login">
              Sign In
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main>
        <section className="pt-32 pb-20 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Your Secure Tax
              <span className="text-primary"> Client Portal</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Upload documents, track refunds, sign forms, and communicate with your
              tax professional—all in one secure place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild data-testid="button-hero-login">
                <a href="/login">
                  Access Your Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 md:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Our portal simplifies your tax filing experience with powerful features
                designed for your convenience.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 md:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Simplify Your Tax Season
                </h2>
                <p className="text-muted-foreground mb-8">
                  No more paper forms, lost documents, or endless phone calls.
                  Our portal puts you in control of your tax filing journey.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 lg:p-12">
                <div className="space-y-4">
                  <div className="bg-background rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-medium">W-2 Uploaded</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your W-2 from Acme Corp has been received
                    </p>
                  </div>
                  <div className="bg-background rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">Refund Approved</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Federal refund of $3,245 approved
                    </p>
                  </div>
                  <div className="bg-background rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <PenTool className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <span className="font-medium">Signature Required</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please sign Form 8879 to authorize e-file
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 md:px-8 bg-primary text-primary-foreground">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              Sign in to access your secure client portal and start managing your
              tax documents today.
            </p>
            <Button size="lg" variant="secondary" asChild data-testid="button-cta-login">
              <a href="/login">
                Sign In to Your Portal
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 md:px-8 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-medium">TaxPortal</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="/affiliate/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Affiliate Portal
            </a>
            <p className="text-sm text-muted-foreground">
              Your information is encrypted and protected with bank-level security.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
