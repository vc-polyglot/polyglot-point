export type Message = {
  id: string;
  from: "user" | "bot";
  text: string;
  createdAt: number;
};
