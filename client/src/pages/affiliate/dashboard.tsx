import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  LogOut,
  UserPlus,
  CheckCircle,
  Clock,
  Share2,
} from "lucide-react";
import { format } from "date-fns";

interface AffiliateStats {
  totalReferrals: number;
  registered: number;
  converted: number;
  conversionRate: number;
  pendingCommissions: number;
  paidCommissions: number;
  totalEarnings: number;
  referralCode: string;
  payoutRate: string;
}

interface Referral {
  id: string;
  leadEmail: string;
  leadName: string | null;
  status: string;
  commissionAmount: string | null;
  commissionStatus: string | null;
  createdAt: string;
}

interface Affiliate {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  referralCode: string;
}

export default function AffiliateDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: affiliate, isLoading: affiliateLoading } = useQuery<Affiliate>({
    queryKey: ["/api/affiliate/auth/user"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AffiliateStats>({
    queryKey: ["/api/affiliate/stats"],
    enabled: !!affiliate,
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery<Referral[]>({
    queryKey: ["/api/affiliate/referrals"],
    enabled: !!affiliate,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/affiliate/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/affiliate/login");
    },
  });

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${stats?.referralCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
  };

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      toast({ title: "Copied!", description: "Referral code copied to clipboard" });
    }
  };

  if (affiliateLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!affiliate) {
    setLocation("/affiliate/login");
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "registered":
        return <Badge variant="secondary">Registered</Badge>;
      case "converted":
        return <Badge className="bg-green-100 text-green-800">Converted</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCommissionBadge = (status: string | null) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800">Pending</Badge>;
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Affiliate Dashboard</h1>
              <p className="text-sm text-gray-500">
                Welcome, {affiliate.firstName || affiliate.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">Your Referral Code</h2>
                <div className="flex items-center gap-2">
                  <code className="text-2xl font-bold text-indigo-600 bg-white px-4 py-2 rounded-lg border">
                    {stats?.referralCode || "Loading..."}
                  </code>
                  <Button size="icon" variant="outline" onClick={copyReferralCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={copyReferralLink} className="gap-2">
                <Share2 className="h-4 w-4" />
                Copy Referral Link
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Referrals</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? <Skeleton className="h-9 w-12" /> : stats?.totalReferrals || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserPlus className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Conversions</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? <Skeleton className="h-9 w-12" /> : stats?.converted || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Conversion Rate</p>
                  <p className="text-3xl font-bold">
                    {statsLoading ? <Skeleton className="h-9 w-12" /> : `${stats?.conversionRate || 0}%`}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Earnings</p>
                  <p className="text-3xl font-bold text-green-600">
                    {statsLoading ? (
                      <Skeleton className="h-9 w-16" />
                    ) : (
                      `$${(stats?.totalEarnings || 0).toFixed(2)}`
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Commission Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm">Pending</span>
                <span className="font-semibold text-yellow-700">
                  ${(stats?.pendingCommissions || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm">Paid</span>
                <span className="font-semibold text-green-700">
                  ${(stats?.paidCommissions || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500">Commission Rate</p>
                <p className="text-xl font-bold text-indigo-600">{stats?.payoutRate || "10%"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Referrals</CardTitle>
              <CardDescription>Track the status of your referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {referralsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : referrals && referrals.length > 0 ? (
                <div className="space-y-3">
                  {referrals.slice(0, 5).map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{referral.leadName || referral.leadEmail}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(referral.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(referral.status)}
                        {referral.commissionAmount && (
                          <span className="text-sm font-medium text-green-600">
                            ${Number(referral.commissionAmount).toFixed(2)}
                          </span>
                        )}
                        {getCommissionBadge(referral.commissionStatus)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Share your referral code to start earning!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
