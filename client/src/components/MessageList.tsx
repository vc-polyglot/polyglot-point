import React from "react";
import type { Message } from "../types";
import { TypingIndicator } from "./TypingIndicator";

type Props = { messages: Message[]; endRef: React.RefObject<HTMLDivElement>; isTyping: boolean };

export const MessageList: React.FC<Props> = ({ messages, endRef, isTyping }) => (
  <div style={{flex:1,overflowY:"auto",padding:"12px 4px",margin:"8px 0"}} aria-live="polite">
    {messages.map(m => (
      <div key={m.id} style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start",marginBottom:"16px"}}>
        <div style={{
          maxWidth:"82%", padding:"12px 16px",
          borderRadius: m.from==="user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          backgroundColor: m.from==="user" ? "#3b82f6" : "#1e293b",
          color: "#ffffff",
          fontSize:"16px", lineHeight:"1.6", whiteSpace:"pre-wrap", wordBreak:"break-word"
        }}>
          {m.text}
        </div>
      </div>
    ))}
    {isTyping && (
      <div style={{display:"flex",justifyContent:"flex-start",marginBottom:"16px"}}>
        <div style={{maxWidth:"82%",padding:"12px 16px",borderRadius:"18px 18px 18px 4px",backgroundColor:"#1e293b",opacity:0.9}}>
          <TypingIndicator />
        </div>
      </div>
    )}
    <div ref={endRef} />
  </div>
);
