"use client";
import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toaster";
import { cn, formatDateTime } from "@/lib/utils";

type Message = {
  id: string;
  senderId: string;
  recipientId: string | null;
  content: string;
  createdAt: string | Date;
  read?: boolean;
};

export function MessagesThread({
  initial,
  currentUserId,
  threadWith, // null → user-to-studio thread, or owner viewing a specific user
  isDemo,
  endpoint,
}: {
  initial: Message[];
  currentUserId: string;
  threadWith?: string | null;
  isDemo?: boolean;
  endpoint: string; // e.g. /api/messages or /api/messages/[userId]
}) {
  const [messages, setMessages] = React.useState<Message[]>(initial);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const { toast } = useToast();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  React.useEffect(() => {
    if (isDemo) return;
    const t = setInterval(() => {
      fetch(endpoint)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d.messages)) setMessages(d.messages);
        })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(t);
  }, [endpoint, isDemo]);

  function send() {
    if (!draft.trim()) return;
    if (isDemo) {
      const newMsg: Message = {
        id: String(Math.random()),
        senderId: currentUserId,
        recipientId: threadWith ?? null,
        content: draft,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, newMsg]);
      setDraft("");
      toast("Demo mode — message saved locally only.", "info");
      return;
    }
    setSending(true);
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft, recipientId: threadWith ?? null }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed");
        const d = await r.json();
        setMessages((m) => [...m, d.message]);
        setDraft("");
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setSending(false));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{threadWith ? "Conversation" : "Studio"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollRef}
          className="h-[420px] overflow-y-auto pr-2 space-y-3 mb-4 no-scrollbar"
        >
          {messages.length === 0 && (
            <p className="text-sm text-clay-mid">No messages yet. Say hello!</p>
          )}
          {messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div
                key={m.id}
                className={cn("flex flex-col", mine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    mine
                      ? "bg-terracotta-500 text-white rounded-br-sm"
                      : "bg-cream-200 text-clay-dark rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
                <span className="text-[10px] text-clay-mid mt-1">
                  {formatDateTime(m.createdAt as any)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 items-end">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Button onClick={send} disabled={sending || !draft.trim()}>
            Send
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
