import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageSquare, Phone, Mail, MapPin, CheckCircle, RefreshCw, PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import StudentLayout from "@/components/layouts/StudentLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().min(9, "Please enter a valid phone number").max(15),
  email: z.string().trim().email("Please enter a valid email").max(255).optional().or(z.literal("")),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

// Simplified schema for logged-in users (name/phone taken from profile)
const loggedInSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
});

type ContactFormData = z.infer<typeof contactSchema>;
type LoggedInFormData = z.infer<typeof loggedInSchema>;

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  RESOLVED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  CLOSED: "bg-muted text-muted-foreground",
};

const getCleanPhone = (phone: string | undefined) =>
  phone?.replace(/@phone\.alict\.lk$/i, '') || '';

// ─── Logged-in user conversation view ────────────────────────────────────────
const ConversationView = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const form = useForm<LoggedInFormData>({
    resolver: zodResolver(loggedInSchema),
    defaultValues: { subject: "", message: "" },
  });

  // Fetch user's conversations
  const { data: conversations = [], refetch } = useQuery({
    queryKey: ['my-contact-messages', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contact_messages')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch replies for selected conversation
  const { data: replies = [] } = useQuery({
    queryKey: ['contact-replies', selectedId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('contact_replies')
        .select('*')
        .eq('message_id', selectedId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedId,
  });

  const selected = conversations.find(c => c.id === selectedId);

  // Send new conversation
  const newConvoMutation = useMutation({
    mutationFn: async (data: LoggedInFormData) => {
      const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim();
      const { error } = await (supabase as any).from('contact_messages').insert({
        name: fullName || 'User',
        phone: getCleanPhone(profile?.phone) || null,
        subject: data.subject,
        message: data.message,
        user_id: user!.id,
        status: 'PENDING',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Message sent!", description: "We'll get back to you soon." });
      form.reset();
      setShowNewForm(false);
      queryClient.invalidateQueries({ queryKey: ['my-contact-messages', user?.id] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  // Send reply
  const replyMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from('contact_replies').insert({
        message_id: selectedId,
        sender_id: user!.id,
        sender_role: 'user',
        body: replyText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ['contact-replies', selectedId] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isResolved = selected?.status === 'RESOLVED' || selected?.status === 'CLOSED';
  const hasActiveConvo = conversations.some(c => c.status !== 'RESOLVED' && c.status !== 'CLOSED');

  if (showNewForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)}>← Back</Button>
          <h2 className="text-lg font-semibold">New Message</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(d => newConvoMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem><FormLabel>Subject *</FormLabel><FormControl><Input placeholder="What is this about?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem><FormLabel>Message *</FormLabel><FormControl><Textarea className="min-h-[120px] resize-none" placeholder="Write your message here..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={newConvoMutation.isPending}>
                  {newConvoMutation.isPending ? "Sending..." : <><Send className="w-4 h-4 mr-2" />Send Message</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedId && selected) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>← Back</Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{selected.subject}</h2>
            <p className="text-xs text-muted-foreground">{format(new Date(selected.created_at), "MMM d, yyyy h:mm a")}</p>
          </div>
          <Badge className={statusColors[selected.status] || statusColors.PENDING}>{selected.status}</Badge>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-4">
            {/* Original message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
                <p className="text-sm">{selected.message}</p>
                <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(selected.created_at), "h:mm a")}</p>
              </div>
            </div>

            {/* Replies */}
            {replies.map((reply: any) => (
              <div key={reply.id} className={`flex ${reply.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  reply.sender_role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm'
                }`}>
                  {reply.sender_role === 'admin' && (
                    <p className="text-xs font-semibold mb-1 opacity-70">Support Team</p>
                  )}
                  <p className="text-sm">{reply.body}</p>
                  <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(reply.created_at), "h:mm a")}</p>
                </div>
              </div>
            ))}

            {isResolved && (
              <div className="text-center py-2">
                <Badge className={statusColors[selected.status]}>Conversation {selected.status}</Badge>
                <p className="text-xs text-muted-foreground mt-1">You can start a new conversation anytime.</p>
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
              onClick={() => replyMutation.mutate()}
              disabled={!replyText.trim() || replyMutation.isPending}
              className="self-end"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Conversation list
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Messages</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {!hasActiveConvo && (
            <Button size="sm" onClick={() => setShowNewForm(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />New Message
            </Button>
          )}
        </div>
      </div>

      {conversations.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No messages yet.</p>
            <Button onClick={() => setShowNewForm(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />Send a Message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((convo: any) => (
            <Card
              key={convo.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedId(convo.id)}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{convo.subject}</p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">{convo.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{format(new Date(convo.created_at), "MMM d, yyyy")}</p>
                  </div>
                  <Badge className={statusColors[convo.status] || statusColors.PENDING}>{convo.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
          {!hasActiveConvo && (
            <Button variant="outline" className="w-full" onClick={() => setShowNewForm(true)}>
              <PlusCircle className="w-4 h-4 mr-2" />Start New Conversation
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Public (guest) contact form ─────────────────────────────────────────────
const GuestContactForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", phone: "", email: "", subject: "", message: "" },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).from("contact_messages").insert({
        name: data.name, phone: data.phone,
        email: data.email || null, subject: data.subject, message: data.message,
      });
      if (error) throw error;
      setIsSubmitted(true);
      form.reset();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send message.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h2>
            <p className="text-muted-foreground mb-6">Thank you for contacting us. We'll get back to you soon.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setIsSubmitted(false)}>Send Another</Button>
              <Button asChild><Link to="/login">Login</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground py-12">
        <div className="container mx-auto px-4 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Contact Us</h1>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Have a question or need help? Send us a message.
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 max-w-6xl mx-auto lg:grid-cols-3">
          <div className="space-y-6">
            {[
              { icon: Phone, label: "Phone", value: "+94 XX XXX XXXX" },
              { icon: Mail, label: "Email", value: "info@example.com" },
              { icon: MapPin, label: "Address", value: "Colombo, Sri Lanka" },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div><h3 className="font-semibold text-foreground">{label}</h3><p className="text-muted-foreground">{value}</p></div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <p className="text-sm text-muted-foreground pt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Login here</Link>
            </p>
          </div>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Send a Message</CardTitle>
              <CardDescription>Fill out the form below and we'll get back to you shortly.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem><FormLabel>Name *</FormLabel><FormControl><Input placeholder="Your name" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone *</FormLabel><FormControl><Input placeholder="07X XXX XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="subject" render={({ field }) => (
                    <FormItem><FormLabel>Subject *</FormLabel><FormControl><Input placeholder="What is this about?" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="message" render={({ field }) => (
                    <FormItem><FormLabel>Message *</FormLabel><FormControl><Textarea placeholder="Write your message here..." className="min-h-[120px] resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Sending..." : <><Send className="w-4 h-4 mr-2" />Send Message</>}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─── Main Contact page ────────────────────────────────────────────────────────
const Contact = () => {
  const { user } = useAuth();

  if (!user) return <GuestContactForm />;

  return (
    <StudentLayout>
      <div className="py-6">
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contact Support</h1>
            <p className="text-muted-foreground text-sm">Send us a message and track your conversations here.</p>
          </div>
        </div>
        <ConversationView />
      </div>
    </StudentLayout>
  );
};

export default Contact;
