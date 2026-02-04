let counter = 0;
const session = crypto.randomUUID().slice(0, 8);
export const generateId = () => `${Date.now()}-${session}-${++counter}`;
