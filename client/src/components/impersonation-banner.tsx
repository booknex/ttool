import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, User } from "lucide-react";

export function ImpersonationBanner() {
  const [, setLocation] = useLocation();
  
  const { data: status } = useQuery<{ isImpersonating: boolean; adminEmail?: string }>({
    queryKey: ["/api/admin/impersonation-status"],
    refetchInterval: 30000,
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/return");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/impersonation-status"] });
      setLocation("/admin");
    },
  });

  if (!status?.isImpersonating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <User className="w-4 h-4" />
        <span className="text-sm font-medium">
          You are viewing as a client. Logged in from: {status.adminEmail}
        </span>
      </div>
      <Button 
        variant="secondary" 
        size="sm"
        onClick={() => returnMutation.mutate()}
        disabled={returnMutation.isPending}
        className="bg-white text-orange-600 hover:bg-orange-50"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        {returnMutation.isPending ? "Returning..." : "Return to Admin"}
      </Button>
    </div>
  );
}
