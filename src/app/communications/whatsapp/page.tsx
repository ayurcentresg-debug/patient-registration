"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Conversation {
  patientId: string;
  patientName: string;
  whatsapp: string;
  lastMessage: string;
  lastMessageAt: string;
  direction: string;
  unreadCount: number;
}

interface Message {
  id: string;
  direction: string;
  from: string;
  to: string;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
  status: string;
  createdAt: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    whatsapp: string;
    phone: string;
  };
}

function StatusIcon({ status }: { status: string }) {
  if (status === "failed") return <span style={{ color: "#e74c3c", fontSize: 12 }}>!</span>;
  if (status === "read") return <span style={{ color: "#53bdeb", fontSize: 12 }}>&#10003;&#10003;</span>;
  if (status === "delivered") return <span style={{ color: "var(--grey-500)", fontSize: 12 }}>&#10003;&#10003;</span>;
  if (status === "sent") return <span style={{ color: "var(--grey-500)", fontSize: 12 }}>&#10003;</span>;
  return null;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function ConversationSkeleton() {
  return (
    <div style={{ padding: "12px 16px", display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--grey-200)", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: "60%", height: 14, background: "var(--grey-200)", borderRadius: 4, marginBottom: 6 }} />
        <div style={{ width: "80%", height: 12, background: "var(--grey-100)", borderRadius: 4 }} />
      </div>
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div style={{ padding: "20px 60px" }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", justifyContent: i % 2 === 0 ? "flex-end" : "flex-start", marginBottom: 12 }}>
          <div style={{
            width: `${40 + i * 15}%`,
            height: 40,
            borderRadius: 8,
            background: i % 2 === 0 ? "#DCF8C6" : "var(--grey-100)",
            opacity: 0.5,
          }} />
        </div>
      ))}
    </div>
  );
}

export default function WhatsAppChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/whatsapp/conversations?${params}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchMessages = useCallback(async (patientId: string) => {
    try {
      setMessagesLoading(true);
      const res = await fetch(`/api/whatsapp/chat?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMessagesLoading(false);
    }
  }, [scrollToBottom]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Poll for new messages
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    if (selectedPatient) {
      pollRef.current = setInterval(() => {
        fetchMessages(selectedPatient.patientId);
        fetchConversations();
      }, 10000);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedPatient, fetchMessages, fetchConversations]);

  const selectConversation = (conv: Conversation) => {
    setSelectedPatient(conv);
    setShowMobileChat(true);
    fetchMessages(conv.patientId);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPatient || sending) return;

    const msgText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    // Optimistic update
    const optimistic: Message = {
      id: `temp_${Date.now()}`,
      direction: "outbound",
      from: "",
      to: selectedPatient.whatsapp,
      body: msgText,
      status: "sending",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch("/api/whatsapp/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.patientId,
          to: selectedPatient.whatsapp,
          message: msgText,
        }),
      });

      if (res.ok) {
        // Refresh messages to get server data
        await fetchMessages(selectedPatient.patientId);
        fetchConversations();
      } else {
        // Mark optimistic message as failed
        setMessages((prev) =>
          prev.map((m) => (m.id === optimistic.id ? { ...m, status: "failed" } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? { ...m, status: "failed" } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    if (d !== currentDate) {
      currentDate = d;
      groupedMessages.push({ date: d, msgs: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  }

  return (
    <div className="yoda-fade-in" style={{ height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid var(--grey-300)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--white)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {showMobileChat && (
            <button
              onClick={() => setShowMobileChat(false)}
              style={{
                display: "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                padding: 4,
              }}
              className="wa-mobile-back"
            >
              &#8592;
            </button>
          )}
          <div style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "#25D366",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 700,
            fontSize: 18,
          }}>
            W
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--grey-900)" }}>WhatsApp Chat</h1>
            <p style={{ fontSize: 12, color: "var(--grey-500)", margin: 0 }}>Two-way messaging with patients</p>
          </div>
        </div>
        <a
          href="/communications"
          style={{
            fontSize: 13,
            color: "var(--blue-500)",
            textDecoration: "none",
          }}
        >
          &#8592; Communications
        </a>
      </div>

      {/* Main Chat Layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Panel — Conversation List */}
        <div
          className="wa-panel-left"
          style={{
            width: 360,
            minWidth: 300,
            borderRight: "1px solid var(--grey-300)",
            background: "var(--white)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div style={{ padding: "12px 12px 8px" }}>
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                border: "1px solid var(--grey-400)",
                borderRadius: "var(--radius-sm)",
                fontSize: 14,
                outline: "none",
                background: "var(--grey-100)",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Conversation List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <>
                <ConversationSkeleton />
                <ConversationSkeleton />
                <ConversationSkeleton />
                <ConversationSkeleton />
              </>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "var(--grey-500)" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>&#128172;</div>
                <p style={{ fontSize: 14 }}>No WhatsApp conversations yet</p>
                <p style={{ fontSize: 12, color: "var(--grey-400)" }}>
                  Send a message from the communications page to start
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.patientId}
                  onClick={() => selectConversation(conv)}
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--grey-200)",
                    background: selectedPatient?.patientId === conv.patientId ? "var(--grey-100)" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPatient?.patientId !== conv.patientId)
                      e.currentTarget.style.background = "var(--grey-100)";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPatient?.patientId !== conv.patientId)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: selectedPatient?.patientId === conv.patientId ? "#25D366" : "var(--grey-300)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 16,
                    flexShrink: 0,
                  }}>
                    {conv.patientName.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{
                        fontWeight: conv.unreadCount > 0 ? 700 : 500,
                        fontSize: 14,
                        color: "var(--grey-900)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {conv.patientName}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--grey-500)", flexShrink: 0, marginLeft: 8 }}>
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 2 }}>
                      <span style={{
                        fontSize: 13,
                        color: conv.unreadCount > 0 ? "var(--grey-800)" : "var(--grey-500)",
                        fontWeight: conv.unreadCount > 0 ? 500 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {conv.direction === "outbound" && <StatusIcon status="sent" />}{" "}
                        {conv.lastMessage.length > 40 ? conv.lastMessage.slice(0, 40) + "..." : conv.lastMessage}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span style={{
                          background: "#25D366",
                          color: "white",
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 10,
                          minWidth: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 6px",
                          flexShrink: 0,
                          marginLeft: 8,
                        }}>
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel — Chat View */}
        <div
          className="wa-panel-right"
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "#E5DDD5",
            position: "relative",
          }}
        >
          {!selectedPatient ? (
            /* Empty State */
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--grey-500)",
              background: "var(--grey-100)",
            }}>
              <div style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "var(--grey-200)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                marginBottom: 16,
              }}>
                &#128172;
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 500, color: "var(--grey-700)", margin: "0 0 8px" }}>
                WhatsApp Business
              </h2>
              <p style={{ fontSize: 14, color: "var(--grey-500)", maxWidth: 300, textAlign: "center" }}>
                Select a conversation from the left panel to start chatting with patients
              </p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{
                padding: "10px 16px",
                background: "var(--white)",
                borderBottom: "1px solid var(--grey-300)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "#25D366",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 600,
                  fontSize: 16,
                }}>
                  {selectedPatient.patientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "var(--grey-900)" }}>
                    {selectedPatient.patientName}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--grey-500)" }}>
                    {selectedPatient.whatsapp}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 60px",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23c5beb0' fill-opacity='0.08'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40zm0-40h2l-2 2V0zm0 4l4-4h2l-6 6V4zm0 4l8-8h2L40 10V8zm0 4L52 0h2L40 14v-2zm0 4L56 0h2L40 18v-2zm0 4L60 0h2L40 22v-2zm0 4L64 0h2L40 26v-2zm0 4L68 0h2L40 30v-2zm0 4L72 0h2L40 34v-2zm0 4L76 0h2L40 38v-2zm0 4L80 0v2L42 40h-2zm4 0L80 4v2L46 40h-2zm4 0L80 8v2L50 40h-2zm4 0l28-28v2L54 40h-2zm4 0l24-24v2L58 40h-2zm4 0l20-20v2L62 40h-2zm4 0l16-16v2L66 40h-2zm4 0l12-12v2L70 40h-2zm4 0l8-8v2l-6 6h-2zm4 0l4-4v2l-2 2h-2z'/%3E%3C/g%3E%3C/svg%3E")`,
              }}>
                {messagesLoading ? (
                  <MessageSkeleton />
                ) : messages.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: "var(--grey-500)",
                    fontSize: 14,
                  }}>
                    <p>No messages yet. Send the first message below.</p>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.date}>
                      {/* Date divider */}
                      <div style={{ textAlign: "center", margin: "16px 0 12px" }}>
                        <span style={{
                          background: "rgba(225, 218, 208, 0.9)",
                          color: "var(--grey-700)",
                          fontSize: 12,
                          padding: "4px 12px",
                          borderRadius: 8,
                          boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
                        }}>
                          {group.date}
                        </span>
                      </div>

                      {group.msgs.map((msg) => (
                        <div
                          key={msg.id}
                          style={{
                            display: "flex",
                            justifyContent: msg.direction === "outbound" ? "flex-end" : "flex-start",
                            marginBottom: 4,
                          }}
                        >
                          <div style={{
                            maxWidth: "65%",
                            padding: "6px 10px 4px",
                            borderRadius: msg.direction === "outbound" ? "8px 0 8px 8px" : "0 8px 8px 8px",
                            background: msg.direction === "outbound" ? "#DCF8C6" : "#FFFFFF",
                            boxShadow: "0 1px 1px rgba(0,0,0,0.08)",
                            position: "relative",
                          }}>
                            {msg.mediaUrl && msg.mediaType?.startsWith("image") && (
                              <img
                                src={msg.mediaUrl}
                                alt="Media"
                                style={{
                                  maxWidth: "100%",
                                  borderRadius: 6,
                                  marginBottom: 4,
                                }}
                              />
                            )}
                            <p style={{ margin: 0, fontSize: 14, color: "var(--grey-900)", lineHeight: 1.4, wordBreak: "break-word" }}>
                              {msg.body}
                            </p>
                            <div style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              alignItems: "center",
                              gap: 4,
                              marginTop: 2,
                            }}>
                              <span style={{ fontSize: 11, color: "var(--grey-500)" }}>
                                {formatTime(msg.createdAt)}
                              </span>
                              {msg.direction === "outbound" && <StatusIcon status={msg.status} />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div style={{
                padding: "10px 16px",
                background: "var(--grey-100)",
                borderTop: "1px solid var(--grey-300)",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
              }}>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid var(--grey-400)",
                    borderRadius: 20,
                    fontSize: 15,
                    outline: "none",
                    resize: "none",
                    maxHeight: 120,
                    lineHeight: 1.4,
                    fontFamily: "inherit",
                    background: "var(--white)",
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    border: "none",
                    background: newMessage.trim() && !sending ? "#25D366" : "var(--grey-300)",
                    color: "white",
                    cursor: newMessage.trim() && !sending ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                    transition: "background 0.2s",
                  }}
                >
                  &#9658;
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .wa-panel-left {
            width: 100% !important;
            min-width: 0 !important;
            display: ${showMobileChat ? "none" : "flex"} !important;
          }
          .wa-panel-right {
            display: ${showMobileChat ? "flex" : "none"} !important;
          }
          .wa-mobile-back {
            display: inline-block !important;
          }
          .wa-panel-right > div:nth-child(2) {
            padding: 12px 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
