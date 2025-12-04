import React from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  error: string | null;
};

export const MessageInput: React.FC<Props> = ({ value, onChange, onSubmit, disabled, error }) => {
  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key==="Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !disabled && value.trim()) {
      e.preventDefault(); onSubmit();
    }
  };

  return (
    <form onSubmit={e=>{e.preventDefault(); if(!disabled && value.trim()) onSubmit();}}
      style={{display:"flex",flexDirection:"column",gap:"10px"}}>
      <textarea autoFocus value={value} onChange={e=>onChange(e.target.value)} onKeyDown={handleKey}
        rows={3} placeholder="Escribe aquí lo que quieras practicar o corregir..."
        style={{width:"100%",resize:"vertical",minHeight:"80px",borderRadius:"16px",border:"2px solid #475569",
          padding:"14px",fontSize:"16px",backgroundColor:"#1e293b",color:"#ffffff",outline:"none",
          placeholderColor:"#94a3b8"}}
        disabled={disabled}
        placeholder="Escribe aquí lo que quieras practicar o corregir..."/>
      {error && <div style={{fontSize:"14px",color:"#fb923c",fontWeight:600}}>{error}</div>}
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button type="submit" disabled={disabled||!value.trim()}
          style={{padding:"12px 32px",borderRadius:"999px",border:"none",fontWeight:700,fontSize:"15px",
            cursor:disabled||!value.trim()?"not-allowed":"pointer",
            background:disabled||!value.trim()?"#475569":"linear-gradient(135deg,#8b5cf6,#3b82f6)",
            color:"white",opacity:disabled||!value.trim()?0.6:1}}>
          Enviar
        </button>
      </div>
    </form>
  );
};
