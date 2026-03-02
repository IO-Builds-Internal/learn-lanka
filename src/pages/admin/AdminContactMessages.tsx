import { useState } from "react";
import { formatPhoneDisplay } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { MessageSquare, Search, RefreshCw, Send, CheckCircle, ArrowLeft, User, Phone, Mail, Calendar } from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  status: string;
  admin_note: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  user_id: string | null;
}

interface Reply {
  id: string;
  message_id: string;
  sender_id: string | null;
  sender_role: string;
  body: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CLOSED: "bg-muted text-muted-foreground",
};

const AdminContactMessages = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: messages = [], isLoading, refetch } = useQuery({
    queryKey: ["contact-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as ContactMessage[];
    },
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["contact-replies", selectedId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contact_replies")
        .select("*")
        .eq("message_id", selectedId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Reply[];
    },
    enabled: !!selectedId,
  });

  const replyMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await (supabase as any).from("contact_replies").insert({
        message_id: selectedId,
        sender_id: user?.id,
        sender_role: "admin",
        body,
      });
      if (error) throw error;
      // Mark as IN_PROGRESS if still PENDING
      const msg = messages.find(m => m.id === selectedId);
      if (msg?.status === "PENDING" || msg?.status === "open") {
        await supabase
          .from("contact_messages")
          .update({ status: "IN_PROGRESS", responded_by: user?.id, responded_at: new Date().toISOString() })
          .eq("id", selectedId!);
      }
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["contact-replies", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contact_messages")
        .update({ status: "RESOLVED", responded_by: user?.id, responded_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Resolved", description: "Conversation marked as resolved." });
      queryClient.invalidateQueries({ queryKey: ["contact-messages"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (msg.phone || "").includes(searchTerm) ||
      (msg.subject || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || msg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selected = messages.find(m => m.id === selectedId);
  const isResolved = selected?.status === "RESOLVED" || selected?.status === "CLOSED";

  const pendingCount = messages.filter(m => m.status === "PENDING" || m.status === "open").length;

  // ── Conversation Thread View ──────────────────────────────────────────────
  if (selectedId && selected) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-3xl">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{selected.subject || "No Subject"}</h1>
              <p className="text-xs text-muted-foreground">{format(new Date(selected.created_at), "MMM d, yyyy h:mm a")}</p>
            </div>
            <Badge className={statusColors[selected.status] || statusColors.PENDING}>{selected.status}</Badge>
            {!isResolved && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-green-600 border-green-600 hover:bg-green-50"
                onClick={() => resolveMutation.mutate(selected.id)}
                disabled={resolveMutation.isPending}
              >
                <CheckCircle className="w-4 h-4" />
                Mark Resolved
              </Button>
            )}
          </div>

          {/* Sender Info */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{selected.name}</span>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{formatPhoneDisplay(selected.phone)}</span>
                  </div>
                )}
                {selected.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{selected.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(selected.created_at), "MMM d, yyyy")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation thread */}
          <Card>
            <CardContent className="pt-4 space-y-4 min-h-[200px]">
              {/* Original message (from user) */}
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-muted text-foreground rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-xs font-semibold mb-1 text-muted-foreground">{selected.name}</p>
                  <p className="text-sm">{selected.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{format(new Date(selected.created_at), "h:mm a")}</p>
                </div>
              </div>

              {replies.map((reply) => (
                <div key={reply.id} className={`flex ${reply.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    reply.sender_role === "admin"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm"
                  }`}>
                    {reply.sender_role !== "admin" && (
                      <p className="text-xs font-semibold mb-1 opacity-70">{selected.name}</p>
                    )}
                    <p className="text-sm">{reply.body}</p>
                    <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(reply.created_at), "h:mm a")}</p>
                  </div>
                </div>
              ))}

              {isResolved && (
                <div className="text-center py-2">
                  <Badge className={statusColors[selected.status]}>Conversation {selected.status}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reply input */}
          {!isResolved && (
            <div className="flex gap-2">
              <Textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="min-h-[80px] resize-none flex-1"
              />
              <Button
                onClick={() => replyMutation.mutate(replyText.trim())}
                disabled={!replyText.trim() || replyMutation.isPending}
                className="self-end"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </AdminLayout>
    );
  }

  // ── Message List ──────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Contact Messages
            </h1>
            <p className="text-muted-foreground">Manage and respond to contact requests</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{messages.length}</div><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{pendingCount}</div><p className="text-sm text-muted-foreground">Pending</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{messages.filter(m => m.status === "IN_PROGRESS").length}</div><p className="text-sm text-muted-foreground">In Progress</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{messages.filter(m => m.status === "RESOLVED").length}</div><p className="text-sm text-muted-foreground">Resolved</p></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input placeholder="Search by name, phone, subject..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader><CardTitle>Messages ({filteredMessages.length})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No messages found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMessages.map((message) => (
                      <TableRow key={message.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(message.id)}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(message.created_at), "MMM d, yyyy")}
                          <div className="text-xs text-muted-foreground">{format(new Date(message.created_at), "h:mm a")}</div>
                        </TableCell>
                        <TableCell className="font-medium">{message.name}</TableCell>
                        <TableCell>{message.phone ? formatPhoneDisplay(message.phone) : "-"}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{message.subject || "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[message.status] || statusColors.PENDING}>{message.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={e => { e.stopPropagation(); setSelectedId(message.id); }}>
                            Open →
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminContactMessages;
