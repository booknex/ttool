import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Clock,
  DollarSign,
  FileText,
  Send,
  CreditCard,
  Building2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import type { RefundTracking } from "@shared/schema";

const federalStages = [
  { id: "submitted", label: "Return Submitted", icon: Send },
  { id: "accepted", label: "Return Accepted", icon: CheckCircle2 },
  { id: "processing", label: "Processing", icon: Clock },
  { id: "approved", label: "Refund Approved", icon: DollarSign },
  { id: "refund_sent", label: "Refund Sent", icon: CreditCard },
];

const getStageIndex = (status: string | null): number => {
  if (!status || status === "not_filed") return -1;
  const index = federalStages.findIndex((s) => s.id === status);
  return index >= 0 ? index : -1;
};

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "completed":
    case "refund_sent":
    case "approved":
      return "text-green-600 dark:text-green-400";
    case "processing":
    case "accepted":
      return "text-blue-600 dark:text-blue-400";
    case "submitted":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-muted-foreground";
  }
};

const formatStatus = (status: string | null): string => {
  if (!status || status === "not_filed") return "Not Filed";
  return status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
};

export default function Refund() {
  const { data: refund, isLoading } = useQuery<RefundTracking>({
    queryKey: ["/api/refund"],
  });

  const federalStageIndex = getStageIndex(refund?.federalStatus || null);
  const stateStageIndex = getStageIndex(refund?.stateStatus || null);

  const federalProgress =
    federalStageIndex >= 0
      ? Math.round(((federalStageIndex + 1) / federalStages.length) * 100)
      : 0;

  const stateProgress =
    stateStageIndex >= 0
      ? Math.round(((stateStageIndex + 1) / federalStages.length) * 100)
      : 0;

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-refund-title">
          Refund Tracker
        </h1>
        <p className="text-muted-foreground">
          Track the status of your federal and state tax refunds
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Federal Refund</CardTitle>
                  <CardDescription>IRS Tax Year 2024</CardDescription>
                </div>
              </div>
              {refund?.lastChecked && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Updated {new Date(refund.lastChecked).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {refund?.federalStatus && refund.federalStatus !== "not_filed" ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <p className={`text-xl font-bold ${getStatusColor(refund.federalStatus)}`}>
                      {formatStatus(refund.federalStatus)}
                    </p>
                  </div>
                  {refund.federalAmount && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Refund Amount</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-federal-refund-amount">
                        ${Number(refund.federalAmount).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{federalProgress}%</span>
                  </div>
                  <Progress value={federalProgress} className="h-2" />
                </div>

                <div className="space-y-4 pt-4">
                  {federalStages.map((stage, idx) => {
                    const isComplete = idx <= federalStageIndex;
                    const isCurrent = idx === federalStageIndex;
                    const Icon = stage.icon;

                    return (
                      <div key={stage.id} className="flex items-start gap-4">
                        <div className="relative">
                          <div
                            className={`
                              w-10 h-10 rounded-full flex items-center justify-center
                              ${isComplete
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                              }
                              ${isCurrent ? "ring-4 ring-primary/20" : ""}
                            `}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </div>
                          {idx < federalStages.length - 1 && (
                            <div
                              className={`
                                absolute left-1/2 top-10 w-0.5 h-8 -translate-x-1/2
                                ${idx < federalStageIndex ? "bg-primary" : "bg-muted"}
                              `}
                            />
                          )}
                        </div>
                        <div className="pt-2">
                          <p className={`font-medium ${isComplete ? "" : "text-muted-foreground"}`}>
                            {stage.label}
                          </p>
                          {isCurrent && (
                            <Badge className="mt-1 bg-primary/10 text-primary">
                              Current Status
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {refund.federalEstimatedDate && (
                  <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Estimated Deposit Date</p>
                      <p className="text-lg font-bold">
                        {new Date(refund.federalEstimatedDate).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Federal Return Filed</p>
                <p className="text-sm">
                  Your federal return has not been filed yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>
                  State Refund {refund?.stateName && `(${refund.stateName})`}
                </CardTitle>
                <CardDescription>State Tax Year 2024</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {refund?.stateStatus && refund.stateStatus !== "not_filed" ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <p className={`text-xl font-bold ${getStatusColor(refund.stateStatus)}`}>
                      {formatStatus(refund.stateStatus)}
                    </p>
                  </div>
                  {refund.stateAmount && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Refund Amount</p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="text-state-refund-amount">
                        ${Number(refund.stateAmount).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{stateProgress}%</span>
                  </div>
                  <Progress value={stateProgress} className="h-2" />
                </div>

                <div className="space-y-4 pt-4">
                  {federalStages.map((stage, idx) => {
                    const isComplete = idx <= stateStageIndex;
                    const isCurrent = idx === stateStageIndex;

                    return (
                      <div key={stage.id} className="flex items-start gap-4">
                        <div className="relative">
                          <div
                            className={`
                              w-10 h-10 rounded-full flex items-center justify-center
                              ${isComplete
                                ? "bg-purple-600 dark:bg-purple-500 text-white"
                                : "bg-muted text-muted-foreground"
                              }
                              ${isCurrent ? "ring-4 ring-purple-500/20" : ""}
                            `}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="w-5 h-5" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </div>
                          {idx < federalStages.length - 1 && (
                            <div
                              className={`
                                absolute left-1/2 top-10 w-0.5 h-8 -translate-x-1/2
                                ${idx < stateStageIndex ? "bg-purple-600 dark:bg-purple-500" : "bg-muted"}
                              `}
                            />
                          )}
                        </div>
                        <div className="pt-2">
                          <p className={`font-medium ${isComplete ? "" : "text-muted-foreground"}`}>
                            {stage.label}
                          </p>
                          {isCurrent && (
                            <Badge className="mt-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                              Current Status
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {refund.stateEstimatedDate && (
                  <div className="p-4 rounded-lg bg-muted/50 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Estimated Deposit Date</p>
                      <p className="text-lg font-bold">
                        {new Date(refund.stateEstimatedDate).toLocaleDateString(undefined, {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No State Return Filed</p>
                <p className="text-sm">
                  Your state return has not been filed yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Federal Refund Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Most refunds are issued within 21 days of the IRS accepting your return.
                E-filed returns with direct deposit are typically faster.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">State Processing Times</h3>
              <p className="text-sm text-muted-foreground">
                State refund processing times vary by state, typically ranging from
                1-8 weeks after acceptance.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h3 className="font-medium mb-2">Contact Us</h3>
              <p className="text-sm text-muted-foreground">
                If you have questions about your refund status, please reach out
                through the Messages section.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
