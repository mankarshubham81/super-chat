export const saveChat = (room: string, messages: string[]) => {
    localStorage.setItem(`chat-${room}`, JSON.stringify(messages));
  };
  
  export const getChat = (room: string): string[] => {
    const data = localStorage.getItem(`chat-${room}`);
    return data ? JSON.parse(data) : [];
  };
  
  export const clearChat = (room: string) => {
    localStorage.removeItem(`chat-${room}`);
  };
  