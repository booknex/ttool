import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Paperclip, FileText, Image, User, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import type { Message } from "@shared/schema";

export default function Messages() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: messages, isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/messages", { content, messageType: "text" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setNewMessage("");
    },
    onError: () => {
      toast({
        title: "Failed to Send",
        description: "Your message could not be sent. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/messages/mark-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  useEffect(() => {
    if (messages && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      // Mark messages as read when viewing
      const unreadMessages = messages.filter((m) => !m.isRead && !m.isFromClient);
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate();
      }
    }
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      sendMutation.mutate(newMessage.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  };

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    msgs.forEach((msg) => {
      const msgDate = formatDate(msg.createdAt);
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const getFileIcon = (name: string | null) => {
    if (!name) return <FileText className="w-4 h-4" />;
    if (name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return <Image className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return "U";
  };

  const messageGroups = messages ? groupMessagesByDate(messages) : [];

  return (
    <div className="p-4 md:p-6 lg:p-8 h-[calc(100vh-4rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-messages-title">
          Messages
        </h1>
        <p className="text-muted-foreground">
          Communicate directly with your tax preparer
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b py-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Shield className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">Your Tax Team</CardTitle>
              <p className="text-xs text-muted-foreground">
                Usually responds within 24 hours
              </p>
            </div>
          </div>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : ""}`}>
                  <Skeleton className="h-20 w-3/4" />
                </div>
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-6">
              {messageGroups.map((group, groupIdx) => (
                <div key={groupIdx}>
                  <div className="flex items-center justify-center mb-4">
                    <Badge variant="outline" className="text-xs font-normal">
                      {group.date}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {group.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isFromClient ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`
                            max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3
                            ${msg.isFromClient
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                            }
                          `}
                        >
                          {msg.messageType === "file" && msg.attachmentName && (
                            <div
                              className={`
                                flex items-center gap-2 p-2 rounded-lg mb-2
                                ${msg.isFromClient ? "bg-primary-foreground/10" : "bg-background"}
                              `}
                            >
                              {getFileIcon(msg.attachmentName)}
                              <span className="text-sm truncate">{msg.attachmentName}</span>
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              msg.isFromClient ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Start a Conversation</p>
                <p className="text-sm">
                  Send a message to your tax team below
                </p>
              </div>
            </div>
          )}
        </ScrollArea>

        <CardContent className="border-t p-4">
          <div className="flex items-end gap-3">
            <Button variant="ghost" size="icon" className="flex-shrink-0" disabled>
              <Paperclip className="w-5 h-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="min-h-[44px] max-h-32 resize-none"
              rows={1}
              data-testid="input-message"
            />
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sendMutation.isPending}
              className="flex-shrink-0"
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
