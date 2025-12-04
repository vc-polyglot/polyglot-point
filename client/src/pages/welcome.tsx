import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Message } from "../types";
import { getUserId, sendMessage } from "../services/chatService";
import { CONSTANTS } from "../constants";
import { generateId } from "../utils/id";
import { Header } from "../components/Header";
import { MessageList } from "../components/MessageList";
import { MessageInput } from "../components/MessageInput";

const welcomeMsg: Message = {
  id: generateId(), from: "bot", createdAt: Date.now(),
  text: "¡Hola! Soy Polyglot Point: Write.\n\nEscribe lo que quieras en cualquier idioma y te corrijo con calma, explicaciones claras y sin juzgar.\n\n¿Empezamos?"
};

const Welcome: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [input, setInput] = useState(""); 
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [userId, setUserId] = useState<string|null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUserId(getUserId()); }, []);
  const scroll = useCallback(() => endRef.current?.scrollIntoView({behavior:"smooth"}), []);
  useEffect(scroll, [messages, scroll]);

  const todayCount = useMemo(() => messages.filter(m => 
    m.from==="user" && Date.now()-m.createdAt < CONSTANTS.ONE_DAY_MS
  ).length, [messages]);

  const send = async () => {
    if (!input.trim() || isSending || !userId || todayCount >= CONSTANTS.DAILY_LIMIT) {
      if (todayCount >= CONSTANTS.DAILY_LIMIT) setError("Límite diario alcanzado. Pronto Premium");
      return;
    }
    const text = input.trim();
    setMessages(p => [...p, {id:generateId(),from:"user",text,createdAt:Date.now()}]);
    setInput(""); setIsSending(true); setError(null);
    try {
      const reply = await sendMessage(text, userId);
      setMessages(p => [...p, {id:generateId(),from:"bot",text:reply,createdAt:Date.now()}]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      console.error(e); setError(msg);
      setMessages(p => [...p, {id:generateId(),from:"bot",text:"Lo siento, hubo un problema.",createdAt:Date.now()}]);
    } finally { setIsSending(false); }
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"16px",backgroundColor:"#020617"}}>
      <div style={{width:"100%",maxWidth:"720px",backgroundColor:"#0f172a",borderRadius:"20px",padding:"20px",
        boxShadow:"0 25px 50px rgba(0,0,0,0.7)",display:"flex",flexDirection:"column",height:"92vh",maxHeight:"800px",
        border:"1px solid #1e293b"}}>
        <Header userMessagesToday={todayCount} />
        <MessageList messages={messages} endRef={endRef} isTyping={isSending} />
        <MessageInput value={input} onChange={setInput} onSubmit={send}
          disabled={isSending || todayCount >= CONSTANTS.DAILY_LIMIT} error={error} />
      </div>
    </div>
  );
};

export default Welcome;
