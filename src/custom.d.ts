import http from 'http';

export interface User {
  id: number,
  isAdmin: boolean,
}

export interface Session {
  id: string,
}

declare module 'http' {
  export interface IncomingMessage {
    user?: User,
    session: Session,
    ip: string, // from Express.Request
  }
}
