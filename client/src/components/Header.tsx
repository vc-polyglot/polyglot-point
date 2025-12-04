import React from "react";
import { CONSTANTS } from "../constants";

export const Header: React.FC<{userMessagesToday: number}> = ({userMessagesToday}) => {
  const limit = userMessagesToday >= CONSTANTS.DAILY_LIMIT;
  return (
    <header style={{borderBottom:"2px solid #334155", padding:"20px 0"}}>
      <h1 style={{fontSize:"30px", fontWeight:900, margin:0, color:"#ffffff", textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
        Polyglot Point: Write
      </h1>
      <p style={{margin:"10px 0 0", fontSize:"16px", color:"#e2e8f0", lineHeight:"1.5", opacity:0.95}}>
        Corrección amable · Explicaciones claras
      </p>
      <div style={{
        marginTop:"16px",
        fontSize:"15px",
        fontWeight:700,
        color: limit ? "#ffb3b3" : "#ffffff",
        backgroundColor: limit ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.1)",
        padding: "10px 16px",
        borderRadius: "12px",
        display: "inline-block",
        border: limit ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.15)"
      }}>
        Mensajes gratis hoy: {userMessagesToday}/{CONSTANTS.DAILY_LIMIT}
        {limit && " → Pronto Premium"}
      </div>
    </header>
  );
};
