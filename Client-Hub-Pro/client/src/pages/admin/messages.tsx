import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

export default function AdminMessages() {
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: messageGroups, isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/messages"],
  });

  const replyMutation = useMutation({
    mutationFn: async ({ userId, content }: { userId: string; content: string }) => {
      return apiRequest("POST", `/api/admin/messages/${userId}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setReplyContent("");
      toast({ title: "Reply sent" });
    },
    onError: () => {
      toast({ title: "Failed to send reply", variant: "destructive" });
    },
  });

  const handleReply = () => {
    if (!replyContent.trim() || !selectedClient) return;
    replyMutation.mutate({ userId: selectedClient.userId, content: replyContent });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (selectedClient) {
    const clientMessages = messageGroups?.find(g => g.userId === selectedClient.userId);
    
    return (
      <div className="p-6 space-y-6 h-full flex flex-col">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-semibold" data-testid="text-selected-client">{selectedClient.clientName}</h1>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {selectedClient.clientEmail}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 p-4">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {clientMessages?.messages
                  .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                  .map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isFromClient ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          msg.isFromClient
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.isFromClient ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                          {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>

            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Textarea
                placeholder="Type your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px]"
                data-testid="textarea-reply"
              />
              <Button 
                onClick={handleReply} 
                disabled={!replyContent.trim() || replyMutation.isPending}
                data-testid="button-send-reply"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" data-testid="text-admin-messages-title">
          Messages
        </h1>
        <Badge variant="outline">
          {messageGroups?.reduce((sum, g) => sum + g.unreadCount, 0) || 0} Unread
        </Badge>
      </div>

      {!messageGroups || messageGroups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No messages yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {messageGroups
            .sort((a, b) => {
              if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
              if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
              return new Date(b.lastMessage?.createdAt || 0).getTime() - 
                     new Date(a.lastMessage?.createdAt || 0).getTime();
            })
            .map((group) => (
              <Card 
                key={group.userId} 
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedClient(group)}
                data-testid={`card-message-${group.userId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback>
                        {group.clientName?.[0]?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{group.clientName}</h3>
                        {group.unreadCount > 0 && (
                          <Badge variant="destructive">{group.unreadCount}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {group.lastMessage?.content || "No messages"}
                      </p>
                    </div>

                    {group.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(group.lastMessage.createdAt), "MMM d")}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
